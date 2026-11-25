import { type FormEvent, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import {
  SITE_CONTENT,
  type WaitlistGoal,
  type WaitlistRole,
} from '../data/content';
import {
  buildWaitlistPayload,
  isStaticPreviewHost,
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
        const hostname =
          typeof window !== 'undefined' ? window.location.hostname : '';
        if (isStaticPreviewHost(hostname)) {
          const previewResult = recordLocalPreviewWaitlist(payload.email);
          setStatus(previewResult.status);
          setFeedbackMessage(previewResult.message);
          if (previewResult.status === 'success') {
            setEmail('');
          }
          return;
        }

        setStatus('error');
        setFeedbackMessage(SITE_CONTENT.waitlist.feedback.error);
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
    <div className="tt-card-float h-full bg-[#00224D] border border-[#1E447A]/90 rounded-3xl p-7 sm:p-10 flex flex-col justify-between">
      <div>
        <h2 className="text-3xl sm:text-4xl text-[#F4F7FC] leading-tight">
          {SITE_CONTENT.waitlist.heading}
        </h2>
        <p className="mt-3 text-lg text-[#D6E2F5] leading-relaxed">
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
            className="block text-base text-[#E2ECFA] mb-2.5"
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
            className={`w-full h-14 px-5 rounded-2xl bg-[#001633] border text-base text-[#F4F7FC] placeholder:text-[#7E99BE] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E] ${
              emailError ? 'border-[#FF204E]' : 'border-[#1E447A] focus:border-[#FF204E]'
            }`}
          />
          {emailError && (
            <p
              id="waitlist-email-error"
              role="alert"
              className="mt-2.5 text-sm text-[#FF7A96] flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{emailError}</span>
            </p>
          )}
        </div>

        {/* Role Selector */}
        <fieldset>
          <legend className="text-base text-[#E2ECFA] mb-3">
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
                  className={`tt-btn h-12 px-5 rounded-full border text-base whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E] ${
                    selected
                      ? 'bg-[#FF204E] text-white border-[#FF204E] shadow-[0_6px_22px_-6px_rgba(255,32,78,0.65)]'
                      : 'bg-[#001633] text-[#D6E2F5] border-[#5D0E41]/90 hover:border-[#A0153E] hover:text-white'
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
          <legend className="text-base text-[#E2ECFA] mb-3">
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
                  className={`tt-btn h-12 px-5 rounded-full border text-base whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E] ${
                    selected
                      ? 'bg-[#FF204E] text-white border-[#FF204E] shadow-[0_6px_22px_-6px_rgba(255,32,78,0.65)]'
                      : 'bg-[#001633] text-[#D6E2F5] border-[#5D0E41]/90 hover:border-[#A0153E] hover:text-white'
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
            className="tt-btn w-full sm:w-auto min-w-[230px] h-14 px-8 rounded-full bg-[#FF204E] text-white text-base hover:bg-[#A0153E] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#00224D]"
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
              className="p-4 rounded-2xl bg-[#5D0E41]/60 border border-[#FF204E]/65 text-white text-base flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-[#FF5C7D] shrink-0" aria-hidden="true" />
              <span>{feedbackMessage}</span>
            </div>
          )}

          {status === 'duplicate' && (
            <div
              role="status"
              className="p-4 rounded-2xl bg-[#001633] border border-[#A0153E]/80 text-[#F4F7FC] text-base flex items-center gap-3"
            >
              <Info className="w-5 h-5 text-[#FF5C7D] shrink-0" aria-hidden="true" />
              <span>{feedbackMessage}</span>
            </div>
          )}

          {status === 'error' && (
            <div
              role="alert"
              className="p-4 rounded-2xl bg-[#5D0E41]/80 border border-[#FF204E] text-white text-base flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-[#FF5C7D] shrink-0" aria-hidden="true" />
              <span>{feedbackMessage}</span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
