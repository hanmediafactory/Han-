import React from "react";
import { Phone, Mail, DollarSign, Calendar } from "lucide-react";
import type { Lead } from "../../types";

interface KanbanPipelineProps {
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: string) => void;
  onEdit: (lead: Lead) => void;
  canManage: boolean;
  onRemove: (lead: Lead) => void;
}

const STAGES = [
  { key: "New", label: "New Leads", color: "bg-page text-text-primary border-neutral-300" },
  { key: "Contacted", label: "Contacted", color: "bg-surface text-text-primary border-border-strong" },
  { key: "Interested", label: "Interested", color: "bg-surface-overlay text-text-primary border-border-strong" },
  { key: "Follow Up", label: "Follow Up", color: "bg-surface text-text-primary border-border-subtle" },
  { key: "Won", label: "Won (Closed)", color: "bg-emerald-950 text-emerald-400 border-emerald-900" },
  { key: "Lost", label: "Lost", color: "bg-surface text-text-muted border-border-subtle" },
];

export const KanbanPipeline: React.FC<KanbanPipelineProps> = ({
  leads = [],
  onStatusChange,
  onEdit,
  canManage,
  onRemove,
}) => {

  return (
    <div className="w-full">
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x no-scrollbar">
        {STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => l.status === stage.key);
          const totalValue = stageLeads.reduce((acc, l) => acc + (Number((l as any).dealValue) || 0), 0);

          return (
            <div
              key={stage.key}
              className="w-[85vw] sm:w-72 shrink-0 snap-start bg-surface-elevated border border-border-subtle rounded-2xl p-3 flex flex-col space-y-2"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border-subtle/60">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stage.color}`}>
                  {stage.label}
                </span>
                <span className="text-xs font-mono font-bold text-text-muted">
                  {stageLeads.length}
                </span>
              </div>
              {totalValue > 0 && (
                <div className="text-[10px] font-mono text-text-secondary font-semibold pb-1">
                  Total: ₹{totalValue.toLocaleString("en-IN")}
                </div>
              )}

              <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1 custom-scrollbar">
                {stageLeads.length === 0 ? (
                  <p className="text-[11px] text-text-secondary italic text-center py-2">
                    No leads
                  </p>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="bg-surface-overlay border border-border-subtle p-3 rounded-xl shadow-sm space-y-2 group hover:border-neutral-600 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-semibold text-xs leading-tight text-text-primary">
                          {lead.name}
                        </h4>
                        <span className="text-[10px] text-text-secondary bg-page border border-border-subtle px-1.5 py-0.5 rounded">
                          {lead.category}
                        </span>
                      </div>

                      {(lead as any).dealValue > 0 && (
                        <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400">
                          <DollarSign size={11} /> ₹{Number((lead as any).dealValue).toLocaleString("en-IN")}
                        </div>
                      )}

                      {((lead as any).email || (lead as any).phone) && (
                        <div className="space-y-1 text-[10px] text-text-secondary">
                          {(lead as any).email && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Mail size={10} /> {(lead as any).email}
                            </div>
                          )}
                          {(lead as any).phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone size={10} /> {(lead as any).phone}
                            </div>
                          )}
                        </div>
                      )}

                      {lead.nextAction && (
                        <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed bg-page/40 p-2 rounded-lg border border-border-subtle/50">
                          {lead.nextAction}
                        </p>
                      )}

                      {(lead as any).followUpDate && (
                        <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-mono">
                          <Calendar size={10} /> Next: {(lead as any).followUpDate}
                        </div>
                      )}

                      {canManage && (
                        <div className="flex items-center justify-between pt-2 mt-1 border-t border-border-subtle gap-2">
                          <button
                            onClick={() => onEdit(lead)}
                            className="text-[10px] font-semibold text-text-secondary hover:text-text-primary transition-colors"
                          >
                            Edit
                          </button>

                          <select aria-label={`Status for ${lead.name}`} value={lead.status} onChange={event => onStatusChange(lead.id, event.target.value)} className="min-w-0 flex-1 text-[10px] bg-page text-text-primary border border-border-subtle rounded px-1 py-0.5">
                            {STAGES.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
                          </select>
                          <button className="text-[10px] font-semibold text-red-500 hover:text-red-400 transition-colors" onClick={() => onRemove(lead)}>Delete</button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
