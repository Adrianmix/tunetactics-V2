import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { SITE_CONTENT } from '../data/content';

export default function FooterLinks() {
  const [activeDoc, setActiveDoc] = useState<'privacy' | 'terms' | null>(null);

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
      : SITE_CONTENT.footer.legal.termsTitle;
  const body =
    activeDoc === 'privacy'
      ? SITE_CONTENT.footer.legal.privacyBody
      : SITE_CONTENT.footer.legal.termsBody;

  return (
    <>
      <nav aria-label="Legal and contact" className="flex items-center gap-7 text-base text-zinc-400">
        <button
          type="button"
          onClick={() => setActiveDoc('privacy')}
          className="tt-nav-link hover:text-zinc-100 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8FF00] rounded-full"
        >
          Privacy
        </button>
        <button
          type="button"
          onClick={() => setActiveDoc('terms')}
          className="tt-nav-link hover:text-zinc-100 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8FF00] rounded-full"
        >
          Terms
        </button>
        <a
          href={`mailto:${SITE_CONTENT.footer.email}`}
          className="tt-nav-link hover:text-zinc-100 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8FF00] rounded-full"
        >
          Contact
        </a>
      </nav>

      {activeDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-dialog-title"
          onClick={() => setActiveDoc(null)}
        >
          <div
            className="w-full max-w-lg bg-[#111115] border border-zinc-800 rounded-3xl p-7 sm:p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <h3
                id="legal-dialog-title"
                className="text-2xl font-semibold text-zinc-50"
              >
                {title}
              </h3>
              <button
                type="button"
                aria-label="Close legal dialog"
                onClick={() => setActiveDoc(null)}
                className="tt-btn w-10 h-10 rounded-full border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8FF00]"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-4 text-base text-zinc-300 leading-relaxed">{body}</p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveDoc(null)}
                className="tt-btn px-5 py-2.5 rounded-full bg-[#C8FF00] text-zinc-950 text-sm font-semibold hover:bg-[#D8FF42] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8FF00]"
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
