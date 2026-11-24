import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWaitlistPayload,
  extractUtmParams,
  normalizeEmail,
  parseWaitlistServerOutput,
  validateEmail,
} from './waitlist';

test('normalizeEmail trims whitespace and lowercases', () => {
  assert.equal(normalizeEmail('  Producer@Studio.IO  '), 'producer@studio.io');
});

test('validateEmail accepts standard emails and rejects malformed ones', () => {
  assert.equal(validateEmail('kian@tunetactics.ir'), true);
  assert.equal(validateEmail('artist+beta@label.co.uk'), true);
  assert.equal(validateEmail(''), false);
  assert.equal(validateEmail('not-an-email'), false);
  assert.equal(validateEmail('missing@tld'), false);
  assert.equal(validateEmail('has space@example.com'), false);
});

test('extractUtmParams extracts available UTM query parameters cleanly', () => {
  const utms = extractUtmParams('?utm_source=twitter&utm_medium=social&utm_campaign=prelaunch');
  assert.deepEqual(utms, {
    utm_source: 'twitter',
    utm_medium: 'social',
    utm_campaign: 'prelaunch',
  });
  assert.deepEqual(extractUtmParams(''), {});
});

test('buildWaitlistPayload constructs normalized payload with role and looking_for', () => {
  const payload = buildWaitlistPayload({
    email: ' Singer@Example.com ',
    role: 'Singer',
    lookingFor: 'Collabs',
    search: '?utm_source=reddit',
    referrer: 'https://reddit.com',
  });
  assert.deepEqual(payload, {
    email: 'singer@example.com',
    role: 'Singer',
    looking_for: 'Collabs',
    honeypot: '',
    referrer: 'https://reddit.com',
    utm_source: 'reddit',
  });
});

test('parseWaitlistServerOutput handles PHP JSON responses and static preview PHP fallback', () => {
  const success = parseWaitlistServerOutput(
    200,
    'application/json',
    JSON.stringify({ status: 'success', message: "You're in. We'll email you when we launch." })
  );
  assert.deepEqual(success, {
    kind: 'json',
    data: { status: 'success', message: "You're in. We'll email you when we launch." },
  });

  const duplicate = parseWaitlistServerOutput(
    409,
    'application/json',
    JSON.stringify({ status: 'duplicate', message: "You're already on the list." })
  );
  assert.deepEqual(duplicate, {
    kind: 'json',
    data: { status: 'duplicate', message: "You're already on the list." },
  });

  const rawPhp = parseWaitlistServerOutput(200, 'text/plain', '<?php header("Content-Type: application/json");');
  assert.deepEqual(rawPhp, { kind: 'non-php-static' });

  const serverFailure = parseWaitlistServerOutput(
    500,
    'application/json',
    JSON.stringify({ status: 'error', message: 'Something went wrong. Try again?' })
  );
  assert.deepEqual(serverFailure, {
    kind: 'json',
    data: { status: 'error', message: 'Something went wrong. Try again?' },
  });
});
