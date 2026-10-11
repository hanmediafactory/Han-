import React from "react";
import { Shield, FileText, X } from "lucide-react";

interface LegalModalProps {
  type: "privacy" | "terms" | null;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  const isPrivacy = type === "privacy";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn"
    >
      <div className="w-full max-w-lg bg-surface-elevated border border-border-strong rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-2 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-surface border border-border-subtle flex items-center justify-center text-emerald-400">
              {isPrivacy ? <Shield size={18} /> : <FileText size={18} />}
            </div>
            <div>
              <h3 id="legal-modal-title" className="font-serif text-lg font-bold text-text-primary">
                {isPrivacy ? "Privacy Policy" : "Terms & Conditions"}
              </h3>
              <p className="text-[10px] font-mono text-text-muted">
                Last updated: October 2026 · HAN Media Factory
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto space-y-3.5 pr-1 text-xs text-text-secondary leading-relaxed custom-scrollbar flex-1">
          {isPrivacy ? (
            <>
              <section className="space-y-1">
                <h4 className="font-bold text-text-primary">1. Information We Collect</h4>
                <p>
                  HAN Media Factory operates as an autonomous operational workspace. We only store
                  information necessary to coordinate team tasks, manage client funnels, track production
                  schedules, and reconcile multi-founder financial ledgers.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="font-bold text-text-primary">2. Local Storage & Offline Cache</h4>
                <p>
                  Your browser stores encrypted identity tokens and offline mutations locally on your device.
                  When you regain internet connectivity, pending updates reconcile atomically with the HAN server.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="font-bold text-text-primary">3. Financial Ledger Integrity</h4>
                <p>
                  Protected savings entries are immutable and ringfenced. Operational expense records maintain
                  deterministic audit trails with user attribution.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="font-bold text-text-primary">4. Zero Third-Party Advertising</h4>
                <p>
                  We never sell, rent, or monetize your workspace data, client leads, or financial summaries
                  to third-party advertising networks.
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-1">
                <h4 className="font-bold text-text-primary">1. Workspace Access & Authentication</h4>
                <p>
                  Access to the HAN workspace is restricted to authorized founders and approved team members.
                  Sharing credentials or bypassing authentication is strictly prohibited.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="font-bold text-text-primary">2. Multi-Founder Financial Protocol</h4>
                <p>
                  All expenses recorded in the shared ledger must represent verified commercial or creative
                  operational costs. Reimbursement settlements are reconciled according to founder share agreements.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="font-bold text-text-primary">3. Intellectual Property</h4>
                <p>
                  All project assets, video productions, brand collateral, and client leads generated within
                  the platform remain the exclusive intellectual property of HAN Media Factory.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="font-bold text-text-primary">4. Data Availability</h4>
                <p>
                  While automated database backups and live health streams protect uptime, team members are
                  encouraged to periodically export workspace reports and ledger archives.
                </p>
              </section>
            </>
          )}
        </div>

        <div className="pt-2 border-t border-border-subtle flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-page text-text-primary text-xs font-bold cursor-pointer hover:bg-neutral-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
