import { SITE_CONTENT, type WaitlistGoal, type WaitlistRole } from '../data/content';

export interface WaitlistPayload {
  email: string;
  role: WaitlistRole;
  looking_for: WaitlistGoal;
  honeypot?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export type WaitlistStatus = 'idle' | 'submitting' | 'success' | 'duplicate' | 'error';

export interface WaitlistResponse {
  status: 'success' | 'duplicate' | 'error';
  message: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized || normalized.length > 254) {
    return false;
  }
  return EMAIL_REGEX.test(normalized);
}

export function extractUtmParams(search: string): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
} {
  const params = new URLSearchParams(search);
  const utm_source = params.get('utm_source')?.trim() || undefined;
  const utm_medium = params.get('utm_medium')?.trim() || undefined;
  const utm_campaign = params.get('utm_campaign')?.trim() || undefined;

  return {
    ...(utm_source ? { utm_source } : {}),
    ...(utm_medium ? { utm_medium } : {}),
    ...(utm_campaign ? { utm_campaign } : {}),
  };
}

export function buildWaitlistPayload(input: {
  email: string;
  role: WaitlistRole;
  lookingFor: WaitlistGoal;
  honeypot?: string;
  search?: string;
  referrer?: string;
}): WaitlistPayload {
  const utm = extractUtmParams(input.search ?? '');
  return {
    email: normalizeEmail(input.email),
    role: input.role,
    looking_for: input.lookingFor,
    honeypot: input.honeypot ?? '',
    ...(input.referrer ? { referrer: input.referrer } : {}),
    ...utm,
  };
}

export function parseWaitlistServerOutput(
  httpStatus: number,
  contentType: string | null,
  rawBody: string
): { kind: 'json'; data: WaitlistResponse } | { kind: 'non-php-static' } {
  const trimmed = rawBody.trim();

  // When running on a Node/Vite static preview without Apache/PHP,
  // requesting /api/waitlist.php returns raw PHP source or an HTML 404/405 page.
  if (
    trimmed.startsWith('<?php') ||
    ((httpStatus === 404 || httpStatus === 405) &&
      !(contentType ?? '').toLowerCase().includes('application/json'))
  ) {
    return { kind: 'non-php-static' };
  }

  try {
    const parsed = JSON.parse(trimmed) as Partial<WaitlistResponse>;
    if (
      parsed.status === 'success' ||
      parsed.status === 'duplicate' ||
      parsed.status === 'error'
    ) {
      return {
        kind: 'json',
        data: {
          status: parsed.status,
          message:
            typeof parsed.message === 'string' && parsed.message.length > 0
              ? parsed.message
              : parsed.status === 'success'
                ? SITE_CONTENT.waitlist.feedback.success
                : parsed.status === 'duplicate'
                  ? SITE_CONTENT.waitlist.feedback.duplicate
                  : SITE_CONTENT.waitlist.feedback.error,
        },
      };
    }
  } catch {
    // Fall through to structured error
  }

  return {
    kind: 'json',
    data: {
      status: 'error',
      message: SITE_CONTENT.waitlist.feedback.error,
    },
  };
}

const LOCAL_PREVIEW_STORAGE_KEY = 'tunetactics_waitlist_preview_emails';

export function recordLocalPreviewWaitlist(email: string): WaitlistResponse {
  const normalized = normalizeEmail(email);
  try {
    const raw = window.localStorage.getItem(LOCAL_PREVIEW_STORAGE_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (list.includes(normalized)) {
      return {
        status: 'duplicate',
        message: SITE_CONTENT.waitlist.feedback.duplicate,
      };
    }
    list.push(normalized);
    window.localStorage.setItem(LOCAL_PREVIEW_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage restriction errors and still confirm submission in preview
  }
  return {
    status: 'success',
    message: SITE_CONTENT.waitlist.feedback.success,
  };
}
