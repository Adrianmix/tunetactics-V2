import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SITE_CONTENT } from '../data/content';

export default function FaqAccordion() {
  const [openId, setOpenId] = useState<string | null>(SITE_CONTENT.faq.items[0].id);

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="divide-y divide-[#193C70]/85 border-t border-b border-[#193C70]/85">
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
                className="w-full py-5 flex items-center justify-between gap-4 text-left text-lg sm:text-xl text-[#F4F7FC] hover:text-[#FF5C7D] transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E] rounded-2xl"
              >
                <span>{item.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-[#9FB4D1] shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                    isOpen ? 'rotate-180 text-[#FF204E]' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              aria-hidden={!isOpen}
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
              }`}
            >
              <div className="overflow-hidden">
                <p className="pb-6 pr-8 text-base sm:text-lg text-[#D6E2F5] leading-relaxed">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
