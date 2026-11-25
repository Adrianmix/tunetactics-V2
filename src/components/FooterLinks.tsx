import { useEffect, useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { SITE_CONTENT } from '../data/content';

type FooterDoc = 'privacy' | 'terms' | 'credits';

export default function FooterLinks() {
  const [activeDoc, setActiveDoc] = useState<FooterDoc | null>(null);

  useEffect(() => {
    if (!activeDoc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDoc(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeDoc]);

  const title =
    activeDoc === 'privacy'
      ? SITE_CONTENT.footer.legal.privacyTitle
      : activeDoc === 'terms'
        ? SITE_CONTENT.footer.legal.termsTitle
        : SITE_CONTENT.footer.credits.title;

  const legalBody =
    activeDoc === 'privacy'
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
          onClick={() => setActiveDoc('privacy')}
          className="tt-nav-link hover:text-white whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E] rounded-full"
        >
          Privacy
        </button>
        <button
          type="button"
          onClick={() => setActiveDoc('terms')}
          className="tt-nav-link hover:text-white whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E] rounded-full"
        >
          Terms
        </button>
        <button
          type="button"
          onClick={() => setActiveDoc('credits')}
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

      {activeDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000D1F]/85 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-dialog-title"
          onClick={() => setActiveDoc(null)}
        >
          <div
            className="w-full max-w-lg bg-[#00224D] border border-[#5D0E41] rounded-3xl p-7 sm:p-8 shadow-2xl"
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
                onClick={() => setActiveDoc(null)}
                className="tt-btn w-10 h-10 rounded-full border border-[#A0153E] text-[#D6E2F5] hover:text-white hover:bg-[#5D0E41] flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E]"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {activeDoc === 'credits' ? (
              <ul className="mt-5 space-y-3">
                {SITE_CONTENT.footer.credits.items.map((item) => (
                  <li
                    key={item.label}
                    className="rounded-2xl bg-[#001633] border border-[#193C70]/90 px-4 py-3.5 flex flex-wrap items-center justify-between gap-2.5"
                  >
                    <div className="min-w-0">
                      <span className="text-xs uppercase tracking-[0.08em] text-[#9FB4D1] block">
                        {item.label}
                      </span>
                      <span className="text-base text-[#F4F7FC]">{item.subject}</span>
                    </div>

                    {item.links.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        {item.links.map((link) => (
                          <a
                            key={link.href}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#5D0E41]/70 border border-[#A0153E] text-xs sm:text-sm text-[#F4F7FC] hover:bg-[#FF204E] hover:border-[#FF204E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E]"
                          >
                            <span>{link.text}</span>
                            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
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

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveDoc(null)}
                className="tt-btn px-6 py-2.5 rounded-full bg-[#FF204E] text-white text-sm hover:bg-[#A0153E] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

