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

// Rate limiting & storage
const RATE_LIMIT_WINDOW_SECONDS = 300; // 5 minutes
const RATE_LIMIT_MAX_ATTEMPTS   = 8;
const DATA_DIR                  = __DIR__ . '/../../waitlist_data';
const SUBSCRIBERS_JSON          = DATA_DIR . '/subscribers.json';
const SUBSCRIBERS_CSV           = DATA_DIR . '/subscribers.csv';
const RATE_LIMIT_JSON           = DATA_DIR . '/rate_limits.json';

// ============================================================================
// 2. HELPERS
// ============================================================================
function jsonResponse(int $httpCode, string $status, string $message): never {
    http_response_code($httpCode);
    echo json_encode([
        'status'  => $status,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function escapeHtml(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
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

function readJsonFile(string $path): array {
    if (!file_exists($path)) {
        return [];
    }
    $raw = @file_get_contents($path);
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function writeJsonFileLocked(string $path, array $data): bool {
    $encoded = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($encoded === false) {
        return false;
    }
    return @file_put_contents($path, $encoded, LOCK_EX) !== false;
}

function checkRateLimit(string $clientIp): bool {
    $limits = readJsonFile(RATE_LIMIT_JSON);
    $now = time();
    $ipKey = hash('sha256', $clientIp);

    // Prune expired buckets
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
        writeJsonFileLocked(RATE_LIMIT_JSON, $limits);
        return false;
    }

    $recent[] = $now;
    $limits[$ipKey] = $recent;
    writeJsonFileLocked(RATE_LIMIT_JSON, $limits);
    return true;
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

$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput ?: '', true);
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

$referrer = mb_substr(trim((string)($payload['referrer'] ?? '')), 0, 500);
$utmSource = mb_substr(trim((string)($payload['utm_source'] ?? '')), 0, 120);
$utmMedium = mb_substr(trim((string)($payload['utm_medium'] ?? '')), 0, 120);
$utmCampaign = mb_substr(trim((string)($payload['utm_campaign'] ?? '')), 0, 120);
$timestampUtc = gmdate('Y-m-d H:i:s') . ' UTC';

// ============================================================================
// 4. DUPLICATE CHECK & STORAGE
// ============================================================================
$subscribers = readJsonFile(SUBSCRIBERS_JSON);
foreach ($subscribers as $entry) {
    if (isset($entry['email']) && strtolower((string)$entry['email']) === $email) {
        jsonResponse(409, 'duplicate', "You're already on the list.");
    }
}

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

$subscribers[] = $newRecord;
if (!writeJsonFileLocked(SUBSCRIBERS_JSON, $subscribers)) {
    jsonResponse(500, 'error', 'Something went wrong. Try again?');
}

// Append CSV export row
$csvNeedsHeader = !file_exists(SUBSCRIBERS_CSV);
if ($csvHandle = @fopen(SUBSCRIBERS_CSV, 'ab')) {
    if (@flock($csvHandle, LOCK_EX)) {
        if ($csvNeedsHeader) {
            fputcsv($csvHandle, ['email', 'role', 'looking_for', 'referrer', 'utm_source', 'utm_medium', 'utm_campaign', 'created_at']);
        }
        fputcsv($csvHandle, [
            $email,
            $role,
            $lookingFor,
            $referrer,
            $utmSource,
            $utmMedium,
            $utmCampaign,
            $timestampUtc,
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
<body style="margin:0;padding:0;background-color:#0A0A0C;color:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0A0A0C;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#141418;border:1px solid #27272A;border-radius:16px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px 20px 32px;border-bottom:1px solid #27272A;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#FFFFFF;">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background-color:#CCFF00;margin-right:8px;vertical-align:middle;"></span>TuneTactics
                  </td>
                  <td align="right" style="font-size:12px;color:#CCFF00;font-weight:600;">
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
              <p style="margin:0 0 22px 0;font-size:15px;line-height:1.6;color:#D4D4D8;">
                Welcome as a TuneTactics Founding Member. When our private beta opens, you'll get first access — plus <strong style="color:#CCFF00;">Pro free for life</strong>.
              </p>

              <!-- Summary Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0A0A0C;border:1px solid #27272A;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 12px 0;font-size:12px;font-weight:600;color:#A1A1AA;">
                      Your studio profile preferences
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#A1A1AA;width:130px;">Email</td>
                        <td style="padding:6px 0;font-size:14px;color:#FFFFFF;font-weight:500;">{$safeEmail}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#A1A1AA;width:130px;">Role</td>
                        <td style="padding:6px 0;font-size:14px;color:#CCFF00;font-weight:600;">{$safeRole}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#A1A1AA;width:130px;">Looking for</td>
                        <td style="padding:6px 0;font-size:14px;color:#FFFFFF;font-weight:500;">{$safeGoal}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0 0;font-size:14px;line-height:1.6;color:#A1A1AA;">
                We'll email you directly as soon as your invite is ready. No spam, ever.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#0F0F13;border-top:1px solid #27272A;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#71717A;">
                TuneTactics — Show your sound. Find your people.<br />
                Questions? Reply or contact <a href="mailto:support@tunetactics.ir" style="color:#CCFF00;text-decoration:none;">support@tunetactics.ir</a>
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
<body style="margin:0;padding:0;background-color:#0A0A0C;color:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0A0A0C;padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#141418;border:1px solid #27272A;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px;border-bottom:1px solid #27272A;">
              <p style="margin:0;font-size:12px;font-weight:600;color:#CCFF00;">
                TuneTactics Waitlist Alert
              </p>
              <h1 style="margin:6px 0 0 0;font-size:20px;font-weight:700;color:#FFFFFF;">
                New Waitlist Signup: {$safeRole}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0A0A0C;border:1px solid #27272A;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:7px 0;font-size:13px;color:#A1A1AA;width:120px;">Email</td>
                        <td style="padding:7px 0;font-size:14px;color:#FFFFFF;font-weight:600;">{$safeEmail}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;font-size:13px;color:#A1A1AA;width:120px;">Role</td>
                        <td style="padding:7px 0;font-size:14px;color:#CCFF00;font-weight:600;">{$safeRole}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;font-size:13px;color:#A1A1AA;width:120px;">Looking for</td>
                        <td style="padding:7px 0;font-size:14px;color:#FFFFFF;font-weight:500;">{$safeGoal}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;font-size:13px;color:#A1A1AA;width:120px;">Timestamp</td>
                        <td style="padding:7px 0;font-size:13px;color:#D4D4D8;">{$safeTime}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;font-size:13px;color:#A1A1AA;width:120px;">Referrer</td>
                        <td style="padding:7px 0;font-size:13px;color:#D4D4D8;">{$safeRef}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;font-size:13px;color:#A1A1AA;width:120px;">UTM</td>
                        <td style="padding:7px 0;font-size:13px;color:#D4D4D8;">{$safeUtm}</td>
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
    while (($line = fgets($socket, 515)) !== false) {
        $response .= $line;
        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }
    $code = (int)substr($response, 0, 3);
    return [$code, $response];
}

function smtpCommand($socket, string $cmd, array $expectedCodes): bool {
    fwrite($socket, $cmd . "\r\n");
    [$code] = smtpReadResponse($socket);
    return in_array($code, $expectedCodes, true);
}

function sendViaSmtp(string $to, string $subject, string $htmlBody, string $replyTo): bool {
    $transportHost = SMTP_ENCRYPTION === 'ssl' ? 'ssl://' . SMTP_HOST : SMTP_HOST;
    $socket = @stream_socket_client(
        $transportHost . ':' . SMTP_PORT,
        $errno,
        $errstr,
        10,
        STREAM_CLIENT_CONNECT
    );
    if (!$socket) {
        return false;
    }

    stream_set_timeout($socket, 10);
    [$code] = smtpReadResponse($socket);
    if ($code !== 220) {
        fclose($socket);
        return false;
    }

    $serverName = $_SERVER['SERVER_NAME'] ?? 'tunetactics.ir';
    if (!smtpCommand($socket, 'EHLO ' . $serverName, [250])) {
        fclose($socket);
        return false;
    }

    if (SMTP_ENCRYPTION === 'tls') {
        if (!smtpCommand($socket, 'STARTTLS', [220])) {
            fclose($socket);
            return false;
        }
        if (!@stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT)) {
            fclose($socket);
            return false;
        }
        if (!smtpCommand($socket, 'EHLO ' . $serverName, [250])) {
            fclose($socket);
            return false;
        }
    }

    if (!smtpCommand($socket, 'AUTH LOGIN', [334])) {
        fclose($socket);
        return false;
    }
    if (!smtpCommand($socket, base64_encode(SMTP_USERNAME), [334])) {
        fclose($socket);
        return false;
    }
    if (!smtpCommand($socket, base64_encode(SMTP_PASSWORD), [235])) {
        fclose($socket);
        return false;
    }

    if (!smtpCommand($socket, 'MAIL FROM:<' . MAIL_FROM_ADDRESS . '>', [250])) {
        fclose($socket);
        return false;
    }
    if (!smtpCommand($socket, 'RCPT TO:<' . $to . '>', [250, 251])) {
        fclose($socket);
        return false;
    }
    if (!smtpCommand($socket, 'DATA', [354])) {
        fclose($socket);
        return false;
    }

    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $headers = [
        'Date: ' . date('r'),
        'From: ' . MAIL_FROM_NAME . ' <' . MAIL_FROM_ADDRESS . '>',
        'To: <' . $to . '>',
        'Reply-To: ' . $replyTo,
        'Subject: ' . $encodedSubject,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
    ];

    $body = chunk_split(base64_encode($htmlBody));
    $message = implode("\r\n", $headers) . "\r\n\r\n" . $body . "\r\n.";
    fwrite($socket, $message . "\r\n");
    [$dataCode] = smtpReadResponse($socket);
    smtpCommand($socket, 'QUIT', [221, 250]);
    fclose($socket);

    return $dataCode === 250;
}

function sendEmail(string $to, string $subject, string $htmlBody, string $replyTo = MAIL_FROM_ADDRESS): bool {
    if (SMTP_PASSWORD !== '' && SMTP_PASSWORD !== 'CHANGE_ME_CPANEL_EMAIL_PASSWORD') {
        if (sendViaSmtp($to, $subject, $htmlBody, $replyTo)) {
            return true;
        }
    }

    // Fallback to cPanel local sendmail / PHP mail()
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $headers = implode("\r\n", [
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'From: ' . MAIL_FROM_NAME . ' <' . MAIL_FROM_ADDRESS . '>',
        'Reply-To: ' . $replyTo,
        'X-Mailer: TuneTactics/1.0',
    ]);

    return @mail($to, $encodedSubject, $htmlBody, $headers);
}

$userSubject = "You're on the TuneTactics waitlist 🎛️";
$userHtml = buildUserConfirmationEmailHtml($email, $role, $lookingFor);
sendEmail($email, $userSubject, $userHtml, MAIL_FROM_ADDRESS);

$adminSubject = "New Waitlist Signup: {$role} — {$email}";
$adminHtml = buildAdminNotificationEmailHtml($newRecord);
sendEmail(ADMIN_EMAIL, $adminSubject, $adminHtml, $email);

jsonResponse(200, 'success', "You're in. We'll email you when we launch.");
