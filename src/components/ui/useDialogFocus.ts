import { useEffect, useRef } from 'react';

export function useDialogFocus(isOpen: boolean, onClose: () => void) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(panel.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled),input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
    ) || []).filter(node => node.getClientRects().length > 0);
    const search = panel.current?.querySelector<HTMLInputElement>('input[type="search"],input[type="text"]');
    (search || focusable()[0] || panel.current)?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close.current();
      }
      if (event.key === 'Tab') {
        const nodes = focusable(), first = nodes[0], last = nodes.at(-1);
        if (event.shiftKey && (document.activeElement === first || !panel.current?.contains(document.activeElement))) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !panel.current?.contains(document.activeElement))) {
          event.preventDefault(); first?.focus();
        }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      if (previous?.isConnected) previous.focus();
    };
  }, [isOpen]);
  return panel;
}
