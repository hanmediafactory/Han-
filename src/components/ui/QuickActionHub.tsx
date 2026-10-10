import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { CommandPaletteModal } from "./CommandPaletteModal";
import { useDialogFocus } from "./useDialogFocus";
import {
  Plus,
  CheckCircle2,
  Briefcase,
  Wallet,
  Target,
  Search,
  X,
  ChevronUp,
} from "lucide-react";

export const QuickActionHub: React.FC = () => {
  const app = useApp();
  const [openMenu, setOpenMenu] = useState(false);
  const [openCommand, setOpenCommand] = useState(false);
  const menu = useDialogFocus(openMenu, () => setOpenMenu(false));
  useEffect(() => {
    if (!app.user) return;
    const handle = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpenMenu(false);
        setOpenCommand(value => !value);
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [app.user]);

  if (!app.user) return null;

  return (
    <>
      {/* Backdrop overlay when Quick Menu is open */}
      {openMenu && (
        <div
          onClick={() => setOpenMenu(false)}
          className="fixed inset-0 z-[8999] bg-black/60 backdrop-blur-sm animate-fadeIn"
        />
      )}

      {/* Floating Action Palette Menu matching Screen 6 */}
      {openMenu && (
        <div ref={menu} role="dialog" aria-modal="true" aria-label="Quick actions" className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-sm z-[9000] bg-[#0E0E10] border border-neutral-800 text-white p-5 rounded-3xl shadow-2xl space-y-4 animate-slide-up">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#18181B] border border-neutral-700 flex items-center justify-center p-1">
                <img src="/logo-clean.png" alt="HAN" className="w-full h-auto object-contain" />
              </div>
              <span className="text-xs font-mono font-bold tracking-widest uppercase text-white">
                QUICK ACTIONS
              </span>
            </div>
            <button
              aria-label="Close quick actions"
              onClick={() => setOpenMenu(false)}
              className="p-1 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {app.can('tasks.manage') && <button
              onClick={() => {
                setOpenMenu(false);
                app.navigateTo("tasks", "All", true);
              }}
              className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-white hover:bg-neutral-800 text-left transition-all group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-neutral-800 text-white border border-neutral-700 flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <span className="block text-xs font-bold text-white transition-colors">
                  New Task
                </span>
                <span className="text-[10px] text-neutral-400">Assign work</span>
              </div>
            </button>}

            {app.can('projects.manage') && <button
              onClick={() => {
                setOpenMenu(false);
                app.navigateTo("projects", "Active", true);
              }}
              className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-white hover:bg-neutral-800 text-left transition-all group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-neutral-800 text-white border border-neutral-700 flex items-center justify-center shrink-0">
                <Briefcase size={18} />
              </div>
              <div>
                <span className="block text-xs font-bold text-white transition-colors">
                  New Project
                </span>
                <span className="text-[10px] text-neutral-400">Roadmap</span>
              </div>
            </button>}

            {app.can('finance.manage') && <button
              onClick={() => {
                setOpenMenu(false);
                app.navigateTo("money", "All", true);
              }}
              className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-white hover:bg-neutral-800 text-left transition-all group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-neutral-800 text-white border border-neutral-700 flex items-center justify-center shrink-0">
                <Wallet size={18} />
              </div>
              <div>
                <span className="block text-xs font-bold text-white transition-colors">
                  Log Expense
                </span>
                <span className="text-[10px] text-neutral-400">Finance</span>
              </div>
            </button>}

            {app.can('leads.manage') && <button
              onClick={() => {
                setOpenMenu(false);
                app.navigateTo("leads", "All", true);
              }}
              className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-white hover:bg-neutral-800 text-left transition-all group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-neutral-800 text-white border border-neutral-700 flex items-center justify-center shrink-0">
                <Target size={18} />
              </div>
              <div>
                <span className="block text-xs font-bold text-white transition-colors">
                  Add Lead
                </span>
                <span className="text-[10px] text-neutral-400">Client CRM</span>
              </div>
            </button>}
          </div>

          <button
            onClick={() => {
              setOpenMenu(false);
              setOpenCommand(true);
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors cursor-pointer shadow-lg"
          >
            <Search size={15} /> Open Command Search <span className="hidden sm:inline">(Ctrl + K)</span>
          </button>
        </div>
      )}

      {/* Floating Action Pill Trigger Button */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[8500] pointer-events-auto">
        <button
          onClick={() => setOpenMenu(!openMenu)}
          className={`px-5 py-3 rounded-full bg-black text-white border border-neutral-700 shadow-2xl flex items-center gap-2 text-xs font-bold transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${
            openMenu ? "ring-2 ring-white bg-neutral-900" : ""
          }`}
          style={{
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.6), 0 0 15px rgba(255, 255, 255, 0.08)",
          }}
          aria-label="Quick Actions"
          aria-haspopup="dialog"
          aria-expanded={openMenu}
        >
          <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs shrink-0">
            {openMenu ? <X size={12} /> : <Plus size={13} />}
          </div>
          <span>Quick Actions</span>
          <ChevronUp size={14} className={`transition-transform duration-300 ${openMenu ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Command Palette Search Modal */}
      <CommandPaletteModal key={openCommand ? 'open' : 'closed'} isOpen={openCommand} onClose={() => setOpenCommand(false)} />
    </>
  );
};
