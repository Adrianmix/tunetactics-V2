import { useEffect, useState } from 'react';
import { Globe, X } from 'lucide-react';
import { SITE_CONTENT } from '../data/content';

type FooterDoc = 'privacy' | 'terms' | 'credits';
type CreditIconKind = 'globe' | 'youtube' | 'telegram';

function CreditLinkIcon({ kind }: { kind: CreditIconKind }) {
  if (kind === 'youtube') {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className="shrink-0"
      >
        <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81ZM9.6 15.6V8.4l6.24 3.6-6.24 3.6Z" />
      </svg>
    );
  }

  if (kind === 'telegram') {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className="shrink-0"
      >
        <path d="M21.93 3.27a1.1 1.1 0 0 0-1.15-.16L2.45 10.67a1.08 1.08 0 0 0 .06 2.02l4.43 1.44 1.72 5.41a1.05 1.05 0 0 0 1.77.41l2.53-2.58 4.46 3.31a1.1 1.1 0 0 0 1.73-.65l3.09-15.6a1.1 1.1 0 0 0-.31-1.16ZM9.9 14.37l-.38 3.21-1.18-3.7 9.6-6.22-8.04 6.71Z" />
      </svg>
    );
  }

  return <Globe className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
}

export default function FooterLinks() {
  const [renderedDoc, setRenderedDoc] = useState<FooterDoc | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const openModal = (doc: FooterDoc) => {
    setRenderedDoc(doc);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
  };

  const closeModal = () => {
    setIsVisible(false);
  };

  useEffect(() => {
    if (!renderedDoc || isVisible) return;
    const timer = window.setTimeout(() => {
      setRenderedDoc(null);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [renderedDoc, isVisible]);

  useEffect(() => {
    if (!renderedDoc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [renderedDoc]);

  const title =
    renderedDoc === 'privacy'
      ? SITE_CONTENT.footer.legal.privacyTitle
      : renderedDoc === 'terms'
        ? SITE_CONTENT.footer.legal.termsTitle
        : SITE_CONTENT.footer.credits.title;

  const legalBody =
    renderedDoc === 'privacy'
      ? SITE_CONTENT.footer.legal.privacyBody
      : SITE_CONTENT.footer.legal.termsBody;

  return (
    <>
      <nav
        aria-label="Legal and contact"
        className="flex flex-wrap items-center gap-5 sm:gap-7 text-base text-[#B8CCE6]"
      >
        <button
          type="button"
          onClick={() => openModal('privacy')}
          className="tt-nav-link hover:text-white whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E] rounded-full"
        >
          Privacy
        </button>
        <button
          type="button"
          onClick={() => openModal('terms')}
          className="tt-nav-link hover:text-white whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E] rounded-full"
        >
          Terms
        </button>
        <button
          type="button"
          onClick={() => openModal('credits')}
          className="tt-nav-link hover:text-white whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E] rounded-full"
        >
          Credits
        </button>
        <a
          href={`mailto:${SITE_CONTENT.footer.email}`}
          className="tt-nav-link hover:text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E] rounded-full"
        >
          Contact
        </a>
      </nav>

      {renderedDoc && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000D1F]/85 backdrop-blur-xs transition-opacity duration-300 ease-out motion-reduce:transition-none ${
            isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-dialog-title"
          onClick={closeModal}
        >
          <div
            className={`w-full max-w-lg max-h-[88vh] overflow-y-auto bg-[#00224D] border border-[#5D0E41] rounded-3xl p-6 sm:p-8 shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
              isVisible
                ? 'opacity-100 scale-100 translate-y-0'
                : 'opacity-0 scale-95 translate-y-3'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <h3
                id="legal-dialog-title"
                className="text-2xl sm:text-3xl text-[#F4F7FC]"
              >
                {title}
              </h3>
              <button
                type="button"
                aria-label="Close footer dialog"
                onClick={closeModal}
                className="tt-btn w-10 h-10 rounded-full border border-[#A0153E] text-[#D6E2F5] hover:text-white hover:bg-[#5D0E41] flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E]"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {renderedDoc === 'credits' ? (
              <ul className="mt-5 space-y-3">
                {SITE_CONTENT.footer.credits.items.map((item) => (
                  <li
                    key={item.label}
                    className="rounded-2xl bg-[#001633] border border-[#193C70]/90 px-4 py-3.5 flex flex-col items-start gap-2.5"
                  >
                    <div className="min-w-0">
                      <span className="text-xs uppercase tracking-[0.08em] text-[#9FB4D1] block">
                        {item.label}
                      </span>
                      <span className="text-base text-[#F4F7FC] block mt-0.5">
                        {item.subject}
                      </span>
                    </div>

                    {item.links.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        {item.links.map((link) => (
                          <a
                            key={link.href}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#5D0E41]/70 border border-[#A0153E] text-xs sm:text-sm text-[#F4F7FC] hover:bg-[#FF204E] hover:border-[#FF204E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E]"
                          >
                            <CreditLinkIcon kind={link.icon} />
                            <span>{link.text}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-base text-[#D6E2F5] leading-relaxed">{legalBody}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
