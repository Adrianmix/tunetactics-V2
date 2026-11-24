import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SITE_CONTENT } from '../data/content';

export default function FaqAccordion() {
  const [openId, setOpenId] = useState<string | null>(SITE_CONTENT.faq.items[0].id);

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="divide-y divide-zinc-800/80 border-t border-b border-zinc-800/80">
      {SITE_CONTENT.faq.items.map((item) => {
        const isOpen = openId === item.id;
        const panelId = `faq-panel-${item.id}`;
        const buttonId = `faq-button-${item.id}`;

        return (
          <div key={item.id} className="py-1">
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggleItem(item.id)}
                className="w-full py-5 flex items-center justify-between gap-4 text-left text-lg sm:text-xl font-medium text-zinc-100 hover:text-[#C8FF00] transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8FF00] rounded-2xl"
              >
                <span>{item.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-zinc-400 shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-[#C8FF00]' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="pb-6 pr-8 text-base sm:text-lg text-zinc-300 leading-relaxed"
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
