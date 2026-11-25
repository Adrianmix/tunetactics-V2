<?php
declare(strict_types=1);

/**
 * TuneTactics Pre-Launch Waitlist Handler (cPanel Shared Hosting)
 *
 * Deployed statically inside public_html/api/waitlist.php.
 * Validates email, role, and looking_for intent, protects against spam bots
 * and duplicates, stores leads in a protected flat-file store, and sends
 * branded HTML emails via cPanel SMTP (support@tunetactics.ir).
 */

header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// ============================================================================
// 1. CONFIGURATION — Update SMTP password after uploading to cPanel
// ============================================================================
const MAIL_FROM_ADDRESS = 'support@tunetactics.ir';
const MAIL_FROM_NAME    = 'TuneTactics';
const ADMIN_EMAIL       = 'support@tunetactics.ir';

// cPanel local SMTP settings (check "Email Accounts -> Connect Devices" in cPanel)
const SMTP_HOST         = 'mail.tunetactics.ir';
const SMTP_PORT         = 465; // 465 for SSL, 587 for STARTTLS
const SMTP_ENCRYPTION   = 'ssl'; // 'ssl' or 'tls'
const SMTP_USERNAME     = 'support@tunetactics.ir';
const SMTP_PASSWORD     = 'CHANGE_ME_CPANEL_EMAIL_PASSWORD';

// Rate limiting, input bounds & storage
const MAX_REQUEST_BYTES         = 16384; // 16 KB max JSON payload
const RATE_LIMIT_WINDOW_SECONDS = 300;   // 5 minutes
const RATE_LIMIT_MAX_ATTEMPTS   = 8;

function resolveDataDir(): string {
    $parentAboveWebRoot = dirname(__DIR__, 2);
    $aboveWebRoot = $parentAboveWebRoot . '/waitlist_data';
    if ((@is_dir($aboveWebRoot) && @is_writable($aboveWebRoot)) || @is_writable($parentAboveWebRoot)) {
        return $aboveWebRoot;
    }
    return dirname(__DIR__) . '/waitlist_data';
}

define('DATA_DIR', resolveDataDir());
define('SUBSCRIBERS_JSON', DATA_DIR . '/subscribers.json');
define('SUBSCRIBERS_CSV', DATA_DIR . '/subscribers.csv');
define('RATE_LIMIT_JSON', DATA_DIR . '/rate_limits.json');
define('MAIL_DEBUG_LOG', DATA_DIR . '/mail_debug.log');

function getSmtpPassword(): string {
    if (SMTP_PASSWORD !== '' && SMTP_PASSWORD !== 'CHANGE_ME_CPANEL_EMAIL_PASSWORD') {
        return SMTP_PASSWORD;
    }

    $envPass = getenv('TUNETACTICS_SMTP_PASSWORD');
    if (is_string($envPass) && $envPass !== '') {
        return $envPass;
    }

    foreach ([DATA_DIR . '/smtp_config.php', __DIR__ . '/smtp_config.php'] as $configPath) {
        if (is_file($configPath) && is_readable($configPath)) {
            $loaded = @include $configPath;
            if (is_array($loaded) && isset($loaded['smtp_password']) && is_string($loaded['smtp_password']) && $loaded['smtp_password'] !== '') {
                return $loaded['smtp_password'];
            }
        }
    }

    return '';
}

// ============================================================================
// 2. HELPERS
// ============================================================================
function jsonResponse(int $httpCode, string $status, string $message, array $extra = []): void {
    http_response_code($httpCode);
    echo json_encode(array_merge([
        'status'  => $status,
        'message' => $message,
    ], $extra), JSON_UNESCAPED_UNICODE);
    exit;
}

function escapeHtml(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function truncateText(string $value, int $maxLength): string {
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $maxLength, 'UTF-8');
    }
    return substr($value, 0, $maxLength);
}

function sanitizeEmailHeaderValue(string $value): string {
    return str_replace(["\r", "\n", "\0"], '', trim($value));
}

function sanitizeCsvCell(string $value): string {
    $clean = str_replace(["\r", "\n", "\0"], ' ', $value);
    $trimmed = ltrim($clean);
    if ($trimmed !== '' && in_array($trimmed[0], ['=', '+', '-', '@', "\t"], true)) {
        return "'" . $clean;
    }
    return $clean;
}

function logMailDebug(string $message): void {
    $line = '[' . gmdate('Y-m-d H:i:s') . ' UTC] ' . $message . "\n";
    @file_put_contents(MAIL_DEBUG_LOG, $line, FILE_APPEND | LOCK_EX);
}

function ensureDataDirectory(): void {
    if (!is_dir(DATA_DIR)) {
        @mkdir(DATA_DIR, 0750, true);
    }
    $htaccessPath = DATA_DIR . '/.htaccess';
    if (!file_exists($htaccessPath)) {
        @file_put_contents(
            $htaccessPath,
            "<IfModule mod_authz_core.c>\n    Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n    Order allow,deny\n    Deny from all\n</IfModule>\n"
        );
    }
}

function updateJsonFileAtomically(string $path, callable $mutator): bool {
    $handle = @fopen($path, 'c+b');
    if ($handle === false) {
        return false;
    }
    if (!@flock($handle, LOCK_EX)) {
        @fclose($handle);
        return false;
    }

    $raw = stream_get_contents($handle);
    $current = [];
    if (is_string($raw) && trim($raw) !== '') {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            $current = $decoded;
        }
    }

    $shouldWrite = true;
    $next = $mutator($current, $shouldWrite);

    $ok = true;
    if ($shouldWrite) {
        $encoded = json_encode($next, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        if ($encoded === false) {
            $ok = false;
        } else {
            rewind($handle);
            ftruncate($handle, 0);
            $written = fwrite($handle, $encoded);
            fflush($handle);
            $ok = $written !== false;
        }
    }

    @flock($handle, LOCK_UN);
    @fclose($handle);
    return $ok;
}

function checkRateLimit(string $clientIp): bool {
    $now = time();
    $ipKey = hash('sha256', $clientIp);
    $allowed = true;

    $ok = updateJsonFileAtomically(
        RATE_LIMIT_JSON,
        static function (array $limits, bool &$shouldWrite) use ($now, $ipKey, &$allowed): array {
            foreach ($limits as $key => $entries) {
                if (!is_array($entries)) {
                    unset($limits[$key]);
                    continue;
                }
                $limits[$key] = array_values(array_filter(
                    $entries,
                    static fn($ts): bool => is_int($ts) && ($now - $ts) < RATE_LIMIT_WINDOW_SECONDS
                ));
                if (count($limits[$key]) === 0) {
                    unset($limits[$key]);
                }
            }

            $recent = $limits[$ipKey] ?? [];
            if (count($recent) >= RATE_LIMIT_MAX_ATTEMPTS) {
                $allowed = false;
                $shouldWrite = true;
                return $limits;
            }

            $recent[] = $now;
            $limits[$ipKey] = $recent;
            $allowed = true;
            $shouldWrite = true;
            return $limits;
        }
    );

    return $ok ? $allowed : true;
}

// ============================================================================
// 3. REQUEST VALIDATION
// ============================================================================
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(405, 'error', 'Something went wrong. Try again?');
}

$contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
if ($contentLength > MAX_REQUEST_BYTES) {
    jsonResponse(413, 'error', 'Something went wrong. Try again?');
}

$rawInput = file_get_contents('php://input', false, null, 0, MAX_REQUEST_BYTES + 1);
if (!is_string($rawInput) || strlen($rawInput) > MAX_REQUEST_BYTES) {
    jsonResponse(413, 'error', 'Something went wrong. Try again?');
}

$payload = json_decode($rawInput, true);
if (!is_array($payload)) {
    jsonResponse(400, 'error', 'Something went wrong. Try again?');
}

// Honeypot check (bots fill hidden "honeypot" field)
$honeypot = trim((string)($payload['honeypot'] ?? ''));
if ($honeypot !== '') {
    jsonResponse(200, 'success', "You're in. We'll email you when we launch.");
}

ensureDataDirectory();

$clientIp = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
if (!checkRateLimit($clientIp)) {
    jsonResponse(429, 'error', 'Something went wrong. Try again?');
}

$email = strtolower(trim((string)($payload['email'] ?? '')));
$role = trim((string)($payload['role'] ?? ''));
$lookingFor = trim((string)($payload['looking_for'] ?? ''));

$allowedRoles = ['Producer', 'Singer', 'Songwriter', 'Other'];
$allowedGoals = ['Collabs', 'Feedback', 'Paid work', 'Just showcasing'];

if ($email === '' || strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(400, 'error', 'Please enter a valid email address.');
}

if (!in_array($role, $allowedRoles, true)) {
    jsonResponse(400, 'error', 'Something went wrong. Try again?');
}

if (!in_array($lookingFor, $allowedGoals, true)) {
    jsonResponse(400, 'error', 'Something went wrong. Try again?');
}

$referrer = truncateText(trim((string)($payload['referrer'] ?? '')), 500);
$utmSource = truncateText(trim((string)($payload['utm_source'] ?? '')), 120);
$utmMedium = truncateText(trim((string)($payload['utm_medium'] ?? '')), 120);
$utmCampaign = truncateText(trim((string)($payload['utm_campaign'] ?? '')), 120);
$timestampUtc = gmdate('Y-m-d H:i:s') . ' UTC';

// ============================================================================
// 4. ATOMIC DUPLICATE CHECK & STORAGE
// ============================================================================
$newRecord = [
    'email'        => $email,
    'role'         => $role,
    'looking_for'  => $lookingFor,
    'referrer'     => $referrer,
    'utm_source'   => $utmSource,
    'utm_medium'   => $utmMedium,
    'utm_campaign' => $utmCampaign,
    'created_at'   => $timestampUtc,
    'ip_hash'      => hash('sha256', $clientIp),
];

$isDuplicate = false;
$storedOk = updateJsonFileAtomically(
    SUBSCRIBERS_JSON,
    static function (array $subscribers, bool &$shouldWrite) use ($email, $newRecord, &$isDuplicate): array {
        foreach ($subscribers as $entry) {
            if (isset($entry['email']) && strtolower((string)$entry['email']) === $email) {
                $isDuplicate = true;
                $shouldWrite = false;
                return $subscribers;
            }
        }
        $subscribers[] = $newRecord;
        $shouldWrite = true;
        return $subscribers;
    }
);

if ($isDuplicate) {
    jsonResponse(409, 'duplicate', "You're already on the list.");
}
if (!$storedOk) {
    jsonResponse(500, 'error', 'Something went wrong. Try again?');
}

// Append CSV export row with spreadsheet formula-injection protection
$csvNeedsHeader = !file_exists(SUBSCRIBERS_CSV);
if ($csvHandle = @fopen(SUBSCRIBERS_CSV, 'ab')) {
    if (@flock($csvHandle, LOCK_EX)) {
        if ($csvNeedsHeader) {
            fputcsv($csvHandle, ['email', 'role', 'looking_for', 'referrer', 'utm_source', 'utm_medium', 'utm_campaign', 'created_at']);
        }
        fputcsv($csvHandle, [
            sanitizeCsvCell($email),
            sanitizeCsvCell($role),
            sanitizeCsvCell($lookingFor),
            sanitizeCsvCell($referrer),
            sanitizeCsvCell($utmSource),
            sanitizeCsvCell($utmMedium),
            sanitizeCsvCell($utmCampaign),
            sanitizeCsvCell($timestampUtc),
        ]);
        @flock($csvHandle, LOCK_UN);
    }
    @fclose($csvHandle);
}

// ============================================================================
// 5. RESPONSIVE DARK-MODE HTML EMAIL TEMPLATES
// ============================================================================
function buildUserConfirmationEmailHtml(string $email, string $role, string $lookingFor): string {
    $safeEmail = escapeHtml($email);
    $safeRole = escapeHtml($role);
    $safeGoal = escapeHtml($lookingFor);

    return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>You're on the TuneTactics waitlist</title>
</head>
<body style="margin:0;padding:0;background-color:#001633;color:#F4F7FC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#001633;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#00224D;border:1px solid #1E447A;border-radius:16px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px 20px 32px;border-bottom:1px solid #193C70;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#FFFFFF;">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background-color:#FF204E;margin-right:8px;vertical-align:middle;"></span>TuneTactics
                  </td>
                  <td align="right" style="font-size:12px;color:#FF5C7D;font-weight:600;">
                    Founding Member
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 14px 0;font-size:26px;line-height:1.25;font-weight:700;color:#FFFFFF;letter-spacing:-0.02em;">
                You're on the waitlist.
              </h1>
              <p style="margin:0 0 22px 0;font-size:15px;line-height:1.6;color:#D6E2F5;">
                Welcome as a TuneTactics Founding Member. When our private beta opens, you'll get first access — plus <strong style="color:#FF5C7D;">Pro free for life</strong>.
              </p>

              <!-- Summary Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#001633;border:1px solid #5D0E41;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 12px 0;font-size:12px;font-weight:600;color:#9FB4D1;">
                      Your studio profile preferences
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#9FB4D1;width:130px;">Email</td>
                        <td style="padding:6px 0;font-size:14px;color:#FFFFFF;font-weight:500;">{$safeEmail}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#9FB4D1;width:130px;">Role</td>
                        <td style="padding:6px 0;font-size:14px;color:#FF5C7D;font-weight:600;">{$safeRole}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#9FB4D1;width:130px;">Looking for</td>
                        <td style="padding:6px 0;font-size:14px;color:#FFFFFF;font-weight:500;">{$safeGoal}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0 0;font-size:14px;line-height:1.6;color:#9FB4D1;">
                We'll email you directly as soon as your invite is ready. No spam, ever.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#001B3E;border-top:1px solid #193C70;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#829BC2;">
                TuneTactics — Show your sound. Find your people.<br />
                Questions? Reply or contact <a href="mailto:support@tunetactics.ir" style="color:#FF5C7D;text-decoration:none;">support@tunetactics.ir</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
}

function buildAdminNotificationEmailHtml(array $record): string {
    $safeEmail = escapeHtml((string)$record['email']);
    $safeRole = escapeHtml((string)$record['role']);
    $safeGoal = escapeHtml((string)$record['looking_for']);
    $safeTime = escapeHtml((string)$record['created_at']);
    $safeRef = escapeHtml((string)($record['referrer'] !== '' ? $record['referrer'] : 'Direct'));
    $utmParts = array_filter([
        $record['utm_source'] !== '' ? 'source=' . $record['utm_source'] : '',
        $record['utm_medium'] !== '' ? 'medium=' . $record['utm_medium'] : '',
        $record['utm_campaign'] !== '' ? 'campaign=' . $record['utm_campaign'] : '',
    ]);
    $safeUtm = escapeHtml(count($utmParts) > 0 ? implode(' · ', $utmParts) : 'None');

    return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Waitlist Signup</title>
</head>
<body style="margin:0;padding:0;background-color:#001633;color:#F4F7FC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#001633;padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#00224D;border:1px solid #1E447A;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px;border-bottom:1px solid #193C70;">
              <p style="margin:0;font-size:12px;font-weight:600;color:#FF5C7D;">
                TuneTactics Waitlist Alert
              </p>
              <h1 style="margin:6px 0 0 0;font-size:20px;font-weight:700;color:#FFFFFF;">
                New Waitlist Signup: {$safeRole}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#001633;border:1px solid #5D0E41;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:7px 0;font-size:13px;color:#9FB4D1;width:120px;">Email</td>
                        <td style="padding:7px 0;font-size:14px;color:#FFFFFF;font-weight:600;">{$safeEmail}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;font-size:13px;color:#9FB4D1;width:120px;">Role</td>
                        <td style="padding:7px 0;font-size:14px;color:#FF5C7D;font-weight:600;">{$safeRole}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;font-size:13px;color:#9FB4D1;width:120px;">Looking for</td>
                        <td style="padding:7px 0;font-size:14px;color:#FFFFFF;font-weight:500;">{$safeGoal}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;font-size:13px;color:#9FB4D1;width:120px;">Timestamp</td>
                        <td style="padding:7px 0;font-size:13px;color:#D6E2F5;">{$safeTime}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;font-size:13px;color:#9FB4D1;width:120px;">Referrer</td>
                        <td style="padding:7px 0;font-size:13px;color:#D6E2F5;">{$safeRef}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;font-size:13px;color:#9FB4D1;width:120px;">UTM</td>
                        <td style="padding:7px 0;font-size:13px;color:#D6E2F5;">{$safeUtm}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
}

// ============================================================================
// 6. SMTP / CPANEL MAIL DISPATCH
// ============================================================================
function smtpReadResponse($socket): array {
    $response = '';
    while (($line = @fgets($socket, 515)) !== false) {
        $response .= $line;
        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }
    $code = (int)substr($response, 0, 3);
    return [$code, trim($response)];
}

function smtpCommand($socket, string $cmd, array $expectedCodes, ?string &$lastResponse = null): bool {
    @fwrite($socket, $cmd . "\r\n");
    [$code, $resp] = smtpReadResponse($socket);
    $lastResponse = $resp !== '' ? $resp : ('Empty response (code ' . $code . ')');
    return in_array($code, $expectedCodes, true);
}

function sanitizeServerHostname(): string {
    $rawHost = (string)($_SERVER['SERVER_NAME'] ?? $_SERVER['HTTP_HOST'] ?? 'tunetactics.ir');
    $hostOnly = explode(':', $rawHost)[0];
    $clean = preg_replace('/[^a-zA-Z0-9.\-]/', '', $hostOnly);
    return ($clean !== null && $clean !== '') ? $clean : 'tunetactics.ir';
}

function sendViaSmtpAttempt(
    string $host,
    int $port,
    string $encryption,
    string $to,
    string $subject,
    string $htmlBody,
    string $replyTo,
    ?string &$errorOut = null
): bool {
    $safeTo = sanitizeEmailHeaderValue($to);
    $safeReplyTo = sanitizeEmailHeaderValue($replyTo);
    $safeSubject = sanitizeEmailHeaderValue($subject);
    if (!filter_var($safeTo, FILTER_VALIDATE_EMAIL) || !filter_var($safeReplyTo, FILTER_VALIDATE_EMAIL)) {
        $errorOut = 'Invalid recipient or reply-to address';
        return false;
    }
    $transportHost = $encryption === 'ssl' ? 'ssl://' . $host : $host;
    $context = stream_context_create([
        'ssl' => [
            'verify_peer'       => false,
            'verify_peer_name'  => false,
            'allow_self_signed' => true,
        ],
    ]);

    $errno = 0;
    $errstr = '';
    $socket = @stream_socket_client(
        $transportHost . ':' . $port,
        $errno,
        $errstr,
        10,
        STREAM_CLIENT_CONNECT,
        $context
    );
    if (!$socket) {
        $errorOut = "Connect {$transportHost}:{$port} failed ({$errno}): {$errstr}";
        return false;
    }

    stream_set_timeout($socket, 10);
    [$code, $resp] = smtpReadResponse($socket);
    if ($code !== 220) {
        $errorOut = "Greeting on {$host}:{$port} returned {$code}: {$resp}";
        fclose($socket);
        return false;
    }

    $serverName = sanitizeServerHostname();
    $lastResp = '';
    if (!smtpCommand($socket, 'EHLO ' . $serverName, [250], $lastResp)) {
        $errorOut = "EHLO failed on {$host}:{$port}: {$lastResp}";
        fclose($socket);
        return false;
    }

    if ($encryption === 'tls') {
        if (!smtpCommand($socket, 'STARTTLS', [220], $lastResp)) {
            $errorOut = "STARTTLS failed on {$host}:{$port}: {$lastResp}";
            fclose($socket);
            return false;
        }
        $cryptoMethod = defined('STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT')
            ? (STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT)
            : STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
        if (!@stream_socket_enable_crypto($socket, true, $cryptoMethod)) {
            $errorOut = "TLS negotiation failed on {$host}:{$port}";
            fclose($socket);
            return false;
        }
        if (!smtpCommand($socket, 'EHLO ' . $serverName, [250], $lastResp)) {
            $errorOut = "Post-TLS EHLO failed on {$host}:{$port}: {$lastResp}";
            fclose($socket);
            return false;
        }
    }

    $smtpPass = getSmtpPassword();

    // Try AUTH LOGIN first, then fall back to AUTH PLAIN if server prefers it
    if (smtpCommand($socket, 'AUTH LOGIN', [334], $lastResp)) {
        if (!smtpCommand($socket, base64_encode(SMTP_USERNAME), [334], $lastResp)) {
            $errorOut = "AUTH LOGIN username rejected on {$host}:{$port}: {$lastResp}";
            fclose($socket);
            return false;
        }
        if (!smtpCommand($socket, base64_encode($smtpPass), [235], $lastResp)) {
            $errorOut = "AUTH LOGIN password rejected on {$host}:{$port}: {$lastResp}";
            fclose($socket);
            return false;
        }
    } else {
        $plainToken = base64_encode("\0" . SMTP_USERNAME . "\0" . $smtpPass);
        if (!smtpCommand($socket, 'AUTH PLAIN ' . $plainToken, [235], $lastResp)) {
            $errorOut = "SMTP AUTH failed on {$host}:{$port}: {$lastResp}";
            fclose($socket);
            return false;
        }
    }

    if (!smtpCommand($socket, 'MAIL FROM:<' . MAIL_FROM_ADDRESS . '>', [250], $lastResp)) {
        $errorOut = "MAIL FROM rejected on {$host}:{$port}: {$lastResp}";
        fclose($socket);
        return false;
    }
    if (!smtpCommand($socket, 'RCPT TO:<' . $safeTo . '>', [250, 251], $lastResp)) {
        $errorOut = "RCPT TO ({$safeTo}) rejected on {$host}:{$port}: {$lastResp}";
        fclose($socket);
        return false;
    }
    if (!smtpCommand($socket, 'DATA', [354], $lastResp)) {
        $errorOut = "DATA rejected on {$host}:{$port}: {$lastResp}";
        fclose($socket);
        return false;
    }

    $encodedSubject = '=?UTF-8?B?' . base64_encode($safeSubject) . '?=';
    $domainPart = strstr(MAIL_FROM_ADDRESS, '@');
    $messageIdDomain = $domainPart !== false ? substr($domainPart, 1) : 'tunetactics.ir';
    try {
        $randomId = bin2hex(random_bytes(8));
    } catch (\Throwable $e) {
        $randomId = uniqid('', true);
    }

    $headers = [
        'Date: ' . date('r'),
        'Message-ID: <' . $randomId . '@' . $messageIdDomain . '>',
        'From: ' . MAIL_FROM_NAME . ' <' . MAIL_FROM_ADDRESS . '>',
        'To: <' . $safeTo . '>',
        'Reply-To: ' . $safeReplyTo,
        'Subject: ' . $encodedSubject,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: 7bit',
    ];

    $body = prepareSafeHtmlBody($htmlBody, "\r\n");
    $dotStuffedBody = preg_replace('/^\./m', '..', $body);
    $message = implode("\r\n", $headers) . "\r\n\r\n" . (is_string($dotStuffedBody) ? $dotStuffedBody : $body) . "\r\n.";
    @fwrite($socket, $message . "\r\n");
    [$dataCode, $dataResp] = smtpReadResponse($socket);
    smtpCommand($socket, 'QUIT', [221, 250], $lastResp);
    fclose($socket);

    if ($dataCode !== 250) {
        $errorOut = "DATA body rejected on {$host}:{$port} ({$dataCode}): {$dataResp}";
        return false;
    }

    return true;
}

function prepareSafeHtmlBody(string $html, string $lineEnding = "\r\n"): string {
    $asciiHtml = preg_replace_callback('/[\xC2-\xF4][\x80-\xBF]+/', static function (array $m): string {
        $bytes = $m[0];
        $len = strlen($bytes);
        $cp = 0;
        if ($len === 2) {
            $cp = ((ord($bytes[0]) & 0x1F) << 6) | (ord($bytes[1]) & 0x3F);
        } elseif ($len === 3) {
            $cp = ((ord($bytes[0]) & 0x0F) << 12) | ((ord($bytes[1]) & 0x3F) << 6) | (ord($bytes[2]) & 0x3F);
        } elseif ($len === 4) {
            $cp = ((ord($bytes[0]) & 0x07) << 18) | ((ord($bytes[1]) & 0x3F) << 12) | ((ord($bytes[2]) & 0x3F) << 6) | (ord($bytes[3]) & 0x3F);
        }
        return $cp > 0 ? '&#' . $cp . ';' : '';
    }, $html);

    $cleaned = preg_replace('/[\x80-\xFF]/', '', is_string($asciiHtml) ? $asciiHtml : $html);
    $normalized = str_replace(["\r\n", "\r", "\n"], $lineEnding, is_string($cleaned) ? $cleaned : $html);
    return $normalized;
}

function sendViaSmtp(string $to, string $subject, string $htmlBody, string $replyTo): bool {
    $candidates = [
        [SMTP_HOST, SMTP_PORT, SMTP_ENCRYPTION],
    ];

    // cPanel shared hosts with SMTP_BLOCK often block external hostnames and require localhost
    if (SMTP_HOST !== 'localhost' && SMTP_HOST !== '127.0.0.1') {
        $candidates[] = ['localhost', 465, 'ssl'];
        $candidates[] = ['localhost', 587, 'tls'];
        $candidates[] = ['127.0.0.1', 587, 'tls'];
    } elseif (SMTP_PORT === 465) {
        $candidates[] = [SMTP_HOST, 587, 'tls'];
    } elseif (SMTP_PORT === 587) {
        $candidates[] = [SMTP_HOST, 465, 'ssl'];
    }

    foreach ($candidates as [$host, $port, $encryption]) {
        $err = null;
        if (sendViaSmtpAttempt($host, (int)$port, (string)$encryption, $to, $subject, $htmlBody, $replyTo, $err)) {
            return true;
        }
        logMailDebug("SMTP attempt failed for {$to} via {$host}:{$port} ({$encryption}) — " . ($err ?? 'unknown error'));
    }

    return false;
}

function sendEmail(string $to, string $subject, string $htmlBody, string $replyTo = MAIL_FROM_ADDRESS): bool {
    $safeTo = sanitizeEmailHeaderValue($to);
    $safeReplyTo = sanitizeEmailHeaderValue($replyTo);
    $safeSubject = sanitizeEmailHeaderValue($subject);
    if (!filter_var($safeTo, FILTER_VALIDATE_EMAIL) || !filter_var($safeReplyTo, FILTER_VALIDATE_EMAIL)) {
        logMailDebug('Skipped email dispatch due to invalid email address.');
        return false;
    }

    if (getSmtpPassword() !== '') {
        if (sendViaSmtp($safeTo, $safeSubject, $htmlBody, $safeReplyTo)) {
            return true;
        }
    } else {
        logMailDebug("SMTP skipped for {$safeTo}: no SMTP password configured; trying PHP mail().");
    }

    // Fallback to cPanel local sendmail / PHP mail() with proper envelope sender (-f)
    $encodedSubject = '=?UTF-8?B?' . base64_encode($safeSubject) . '?=';
    $domainPart = strstr(MAIL_FROM_ADDRESS, '@');
    $messageIdDomain = $domainPart !== false ? substr($domainPart, 1) : 'tunetactics.ir';
    try {
        $randomId = bin2hex(random_bytes(8));
    } catch (\Throwable $e) {
        $randomId = uniqid('', true);
    }

    $headers = implode("\n", [
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: 7bit',
        'Message-ID: <' . $randomId . '@' . $messageIdDomain . '>',
        'From: ' . MAIL_FROM_NAME . ' <' . MAIL_FROM_ADDRESS . '>',
        'Reply-To: ' . $safeReplyTo,
        'X-Mailer: TuneTactics/1.0',
    ]);
    $safeBody = prepareSafeHtmlBody($htmlBody, "\n");

    $sent = @mail($safeTo, $encodedSubject, $safeBody, $headers, '-f' . MAIL_FROM_ADDRESS);
    if (!$sent) {
        $sent = @mail($safeTo, $encodedSubject, $safeBody, $headers);
    }
    if (!$sent) {
        logMailDebug("PHP mail() fallback failed for {$safeTo}.");
    }

    return $sent;
}

$userSubject = "You're on the TuneTactics waitlist 🎛️";
$userHtml = buildUserConfirmationEmailHtml($email, $role, $lookingFor);
$userMailSent = sendEmail($email, $userSubject, $userHtml, MAIL_FROM_ADDRESS);

$adminSubject = "New Waitlist Signup: {$role} — {$email}";
$adminHtml = buildAdminNotificationEmailHtml($newRecord);
$adminMailSent = sendEmail(ADMIN_EMAIL, $adminSubject, $adminHtml, $email);

jsonResponse(200, 'success', "You're in. We'll email you when we launch.", [
    'mail_dispatched' => $userMailSent && $adminMailSent,
]);
