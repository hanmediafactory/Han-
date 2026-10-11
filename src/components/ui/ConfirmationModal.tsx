import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn"
    >
      <div className="w-full max-w-sm bg-surface-elevated border border-border-strong rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                isDestructive
                  ? "bg-red-950/50 border border-red-800/80 text-red-400"
                  : "bg-surface-overlay border border-border-subtle text-text-primary"
              }`}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3
                id="confirm-modal-title"
                className="font-serif text-base font-bold text-text-primary"
              >
                {title}
              </h3>
            </div>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="text-text-muted hover:text-text-primary p-1 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-text-secondary leading-relaxed">{message}</p>

        <div className="pt-2 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl bg-surface-overlay hover:bg-surface border border-border-subtle text-text-secondary hover:text-text-primary text-xs font-semibold cursor-pointer transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer shadow-md transition-all active:scale-98 ${
              isDestructive
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-page text-text-primary hover:bg-neutral-200"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
