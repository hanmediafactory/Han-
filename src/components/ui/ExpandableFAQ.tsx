import React, { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    id: "faq-goals",
    question: "How do Finance Goals track my protected savings?",
    answer:
      "When you add a Finance Goal, your live protected savings (from the savings entries ledger) automatically counts toward the target in real time. The interactive flowchart maps your inflow, operating spend, and ringfenced reserve across 4 milestone stages (25%, 50%, 75%, 100%).",
  },
  {
    id: "faq-goals-crud",
    question: "Can I add, edit, and delete my own custom finance goals?",
    answer:
      "Yes! You have full control. Click '+ Add Goal' to create any custom target (runway buffer, equipment fund, tax reserve). You can edit targets or click the trash icon on any goal to delete it at any time.",
  },
  {
    id: "faq-splits",
    question: "How does the multi-founder expense split and debt settlement work?",
    answer:
      "When a founder records an expense, it can be individual, equal (split evenly among the 4 founders), or customized. The pairwise settlement matrix computes exact net debts and lets you record settlements with 1 click.",
  },
  {
    id: "faq-offline",
    question: "Does the workspace work offline?",
    answer:
      "Yes. Any task toggles, progress updates, or notes you add while offline are stored securely in local browser storage and automatically sync with the server once connectivity is restored.",
  },
  {
    id: "faq-funnels",
    question: "How do leads convert into active clients?",
    answer:
      "Move any lead through the Kanban pipeline stages (New → Contacted → Interested → Follow Up → Won). Clicking '✓ Won' instantly converts the deal into an active client record with recorded revenue.",
  },
];

export const ExpandableFAQ: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [openId, setOpenId] = useState<string | null>(compact ? null : "faq-goals");

  return (
    <div className="space-y-3 select-none" data-testid="expandable-faq">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-text-primary shrink-0">
          <HelpCircle size={15} />
        </div>
        <h4 className="font-serif text-sm font-bold text-text-primary">
          Frequently Asked Questions & Help
        </h4>
      </div>

      <div className="space-y-2">
        {FAQS.map((faq) => {
          const isOpen = openId === faq.id;
          return (
            <div
              key={faq.id}
              className="rounded-2xl bg-surface-elevated border border-border-subtle overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenId(isOpen ? null : faq.id)}
                className="w-full p-3.5 text-left flex items-center justify-between gap-3 cursor-pointer hover:bg-surface-overlay/50 transition-colors"
              >
                <span className="text-xs font-semibold text-text-primary leading-snug">
                  {faq.question}
                </span>
                <ChevronDown
                  size={15}
                  className={`text-text-muted transition-transform shrink-0 ${
                    isOpen ? "rotate-180 text-text-primary" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-3.5 pb-3.5 pt-0 text-xs text-text-secondary leading-relaxed border-t border-border-subtle/40 mt-1">
                  <p className="pt-2">{faq.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
