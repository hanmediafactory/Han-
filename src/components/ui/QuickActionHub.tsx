import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { CommandPaletteModal } from "./CommandPaletteModal";
import {
  Plus,
  CheckCircle2,
  Briefcase,
  Wallet,
  Target,
  Search,
  X,
  Sparkles,
  ChevronUp,
} from "lucide-react";

export const QuickActionHub: React.FC = () => {
  const app = useApp();
  const [openMenu, setOpenMenu] = useState(false);
  const [openCommand, setOpenCommand] = useState(false);

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

      {/* Floating Action Palette Menu */}
      {openMenu && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-sm z-[9000] bg-[#0A0A0A] border border-neutral-800 text-white p-4 rounded-3xl shadow-2xl space-y-3 animate-slide-up">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-amber-400 flex items-center gap-1.5">
              <Sparkles size={13} /> Quick Execution Hub
            </span>
            <button
              onClick={() => setOpenMenu(false)}
              className="p-1 text-neutral-400 hover:text-white rounded-lg"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => {
                setOpenMenu(false);
                app.navigateTo("tasks", "All", true);
              }}
              className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-400 hover:bg-neutral-800 text-left transition-all group"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <span className="block text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                  New Task
                </span>
                <span className="text-[10px] text-neutral-400">Assign work</span>
              </div>
            </button>

            <button
              onClick={() => {
                setOpenMenu(false);
                app.navigateTo("projects", "Active", true);
              }}
              className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-emerald-400 hover:bg-neutral-800 text-left transition-all group"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Briefcase size={18} />
              </div>
              <div>
                <span className="block text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                  New Project
                </span>
                <span className="text-[10px] text-neutral-400">Roadmap</span>
              </div>
            </button>

            <button
              onClick={() => {
                setOpenMenu(false);
                app.navigateTo("money", "All", true);
              }}
              className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-sky-400 hover:bg-neutral-800 text-left transition-all group"
            >
              <div className="w-9 h-9 rounded-xl bg-sky-400/10 text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Wallet size={18} />
              </div>
              <div>
                <span className="block text-xs font-bold text-white group-hover:text-sky-400 transition-colors">
                  Log Expense
                </span>
                <span className="text-[10px] text-neutral-400">Finance</span>
              </div>
            </button>

            <button
              onClick={() => {
                setOpenMenu(false);
                app.navigateTo("leads", "All", true);
              }}
              className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-purple-400 hover:bg-neutral-800 text-left transition-all group"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-400/10 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Target size={18} />
              </div>
              <div>
                <span className="block text-xs font-bold text-white group-hover:text-purple-400 transition-colors">
                  Add Lead
                </span>
                <span className="text-[10px] text-neutral-400">Client CRM</span>
              </div>
            </button>
          </div>

          <button
            onClick={() => {
              setOpenMenu(false);
              setOpenCommand(true);
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors cursor-pointer shadow-lg"
          >
            <Search size={15} /> Open Command Search (Ctrl + K)
          </button>
        </div>
      )}

      {/* Floating Action Pill Trigger Button */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[8500] pointer-events-auto">
        <button
          onClick={() => setOpenMenu(!openMenu)}
          className={`px-5 py-3 rounded-full bg-black text-white border border-neutral-700 shadow-2xl flex items-center gap-2 text-xs font-bold transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${
            openMenu ? "ring-2 ring-amber-400 bg-neutral-900" : ""
          }`}
          style={{
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4), 0 0 15px rgba(255, 255, 255, 0.1)",
          }}
          aria-label="Quick Actions"
        >
          <div className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center font-bold text-xs shrink-0">
            {openMenu ? <X size={12} /> : <Plus size={13} />}
          </div>
          <span>Quick Actions</span>
          <ChevronUp size={14} className={`transition-transform duration-300 ${openMenu ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Command Palette Search Modal */}
      <CommandPaletteModal isOpen={openCommand} onClose={() => setOpenCommand(false)} />
    </>
  );
};
