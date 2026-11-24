import { type FormEvent, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import {
  SITE_CONTENT,
  type WaitlistGoal,
  type WaitlistRole,
} from '../data/content';
import {
  buildWaitlistPayload,
  parseWaitlistServerOutput,
  recordLocalPreviewWaitlist,
  validateEmail,
  type WaitlistStatus,
} from '../utils/waitlist';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WaitlistRole>('Producer');
  const [lookingFor, setLookingFor] = useState<WaitlistGoal>('Collabs');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<WaitlistStatus>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailError('');
    setFeedbackMessage('');

    if (!validateEmail(email)) {
      setEmailError(SITE_CONTENT.waitlist.feedback.invalidEmail);
      return;
    }

    setStatus('submitting');

    const payload = buildWaitlistPayload({
      email,
      role,
      lookingFor,
      honeypot,
      search: typeof window !== 'undefined' ? window.location.search : '',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
    });

    try {
      const response = await fetch('/api/waitlist.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const rawBody = await response.text();
      const parsed = parseWaitlistServerOutput(
        response.status,
        response.headers.get('content-type'),
        rawBody
      );

      if (parsed.kind === 'non-php-static') {
        const previewResult = recordLocalPreviewWaitlist(payload.email);
        setStatus(previewResult.status);
        setFeedbackMessage(previewResult.message);
        if (previewResult.status === 'success') {
          setEmail('');
        }
        return;
      }

      setStatus(parsed.data.status);
      setFeedbackMessage(parsed.data.message);
      if (parsed.data.status === 'success') {
        setEmail('');
      }
    } catch {
      setStatus('error');
      setFeedbackMessage(SITE_CONTENT.waitlist.feedback.error);
    }
  };

  return (
    <div className="tt-card-float h-full bg-[#111115] border border-zinc-800/90 rounded-3xl p-7 sm:p-10 flex flex-col justify-between">
      <div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-50">
          {SITE_CONTENT.waitlist.heading}
        </h2>
        <p className="mt-3 text-lg text-zinc-300 leading-relaxed">
          {SITE_CONTENT.waitlist.body}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-7">
        {/* Honeypot anti-spam trap */}
        <div className="sr-only" aria-hidden="true">
          <label htmlFor="waitlist-company">Company</label>
          <input
            id="waitlist-company"
            type="text"
            name="company"
            autoComplete="off"
            tabIndex={-1}
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        {/* Email Field */}
        <div>
          <label
            htmlFor="waitlist-email"
            className="block text-base font-medium text-zinc-200 mb-2.5"
          >
            {SITE_CONTENT.waitlist.emailLabel}
          </label>
          <input
            id="waitlist-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={SITE_CONTENT.waitlist.emailPlaceholder}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
              if (status !== 'idle' && status !== 'submitting') {
                setStatus('idle');
                setFeedbackMessage('');
              }
            }}
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? 'waitlist-email-error' : undefined}
            className={`w-full h-14 px-5 rounded-2xl bg-[#09090B] border text-base text-zinc-100 placeholder:text-zinc-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C8FF00] ${
              emailError ? 'border-red-500/80' : 'border-zinc-800 focus:border-[#C8FF00]'
            }`}
          />
          {emailError && (
            <p
              id="waitlist-email-error"
              role="alert"
              className="mt-2.5 text-sm text-red-400 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{emailError}</span>
            </p>
          )}
        </div>

        {/* Role Selector */}
        <fieldset>
          <legend className="text-base font-medium text-zinc-200 mb-3">
            {SITE_CONTENT.waitlist.roleLabel}
          </legend>
          <div className="flex flex-wrap gap-2.5 sm:gap-3">
            {SITE_CONTENT.waitlist.roles.map((option) => {
              const selected = role === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setRole(option)}
                  className={`tt-btn h-12 px-5 rounded-full border text-base font-medium whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8FF00] ${
                    selected
                      ? 'bg-[#C8FF00] text-zinc-950 border-[#C8FF00]'
                      : 'bg-[#09090B] text-zinc-300 border-zinc-700/80 hover:border-zinc-500 hover:text-zinc-100'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Looking For Selector */}
        <fieldset>
          <legend className="text-base font-medium text-zinc-200 mb-3">
            {SITE_CONTENT.waitlist.lookingForLabel}
          </legend>
          <div className="flex flex-wrap gap-2.5 sm:gap-3">
            {SITE_CONTENT.waitlist.lookingForOptions.map((option) => {
              const selected = lookingFor === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setLookingFor(option)}
                  className={`tt-btn h-12 px-5 rounded-full border text-base font-medium whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8FF00] ${
                    selected
                      ? 'bg-[#C8FF00] text-zinc-950 border-[#C8FF00]'
                      : 'bg-[#09090B] text-zinc-300 border-zinc-700/80 hover:border-zinc-500 hover:text-zinc-100'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Submit & Feedback */}
        <div className="pt-2 space-y-4">
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="tt-btn w-full sm:w-auto min-w-[230px] h-14 px-8 rounded-full bg-[#C8FF00] text-zinc-950 font-semibold text-base hover:bg-[#D8FF42] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8FF00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111115]"
          >
            {status === 'submitting' && (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            )}
            <span>
              {status === 'submitting'
                ? SITE_CONTENT.waitlist.loadingLabel
                : SITE_CONTENT.waitlist.submitLabel}
            </span>
          </button>

          {status === 'success' && (
            <div
              role="status"
              className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-700/60 text-emerald-200 text-base flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-[#C8FF00] shrink-0" aria-hidden="true" />
              <span>{feedbackMessage}</span>
            </div>
          )}

          {status === 'duplicate' && (
            <div
              role="status"
              className="p-4 rounded-2xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-base flex items-center gap-3"
            >
              <Info className="w-5 h-5 text-[#C8FF00] shrink-0" aria-hidden="true" />
              <span>{feedbackMessage}</span>
            </div>
          )}

          {status === 'error' && (
            <div
              role="alert"
              className="p-4 rounded-2xl bg-red-950/60 border border-red-700/60 text-red-200 text-base flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" aria-hidden="true" />
              <span>{feedbackMessage}</span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
