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
  { key: "New", label: "New Leads", color: "bg-blue-50 text-blue-800 border-blue-200" },
  { key: "Contacted", label: "Contacted", color: "bg-amber-50 text-amber-800 border-amber-200" },
  { key: "Interested", label: "Interested", color: "bg-purple-50 text-purple-800 border-purple-200" },
  { key: "Follow Up", label: "Follow Up", color: "bg-indigo-50 text-indigo-800 border-indigo-200" },
  { key: "Won", label: "Won (Closed)", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  { key: "Lost", label: "Lost", color: "bg-rose-50 text-rose-800 border-rose-200" },
];

export const KanbanPipeline: React.FC<KanbanPipelineProps> = ({
  leads,
  onStatusChange,
  onEdit,
  canManage,
  onRemove,
}) => {

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => l.status === stage.key);
          const totalValue = stageLeads.reduce((acc, l) => acc + (Number((l as any).dealValue) || 0), 0);

          return (
            <div
              key={stage.key}
              className="bg-neutral-50/80 border border-neutral-200/80 rounded-2xl p-3 flex flex-col space-y-2"
            >
              <div className="flex items-center justify-between pb-1 border-b border-neutral-200/60">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stage.color}`}>
                  {stage.label}
                </span>
                <span className="text-xs font-mono font-bold text-neutral-500">
                  {stageLeads.length}
                </span>
              </div>
              {totalValue > 0 && (
                <div className="text-[10px] font-mono text-neutral-600 font-semibold">
                  Total: ₹{totalValue.toLocaleString("en-IN")}
                </div>
              )}

              <div className="space-y-2 min-h-24 max-h-96 overflow-y-auto pr-0.5 no-scrollbar">
                {stageLeads.length === 0 ? (
                  <p className="text-[11px] text-neutral-400 italic text-center py-4">
                    No leads
                  </p>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="bg-white border border-neutral-200 p-3 rounded-xl shadow-2xs space-y-2 group hover:border-black transition-colors"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-semibold text-xs leading-tight text-neutral-900">
                          {lead.name}
                        </h4>
                        <span className="text-[10px] text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                          {lead.category}
                        </span>
                      </div>

                      {(lead as any).dealValue > 0 && (
                        <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-700">
                          <DollarSign size={11} /> ₹{Number((lead as any).dealValue).toLocaleString("en-IN")}
                        </div>
                      )}

                      {((lead as any).email || (lead as any).phone) && (
                        <div className="space-y-0.5 text-[10px] text-neutral-500">
                          {(lead as any).email && (
                            <div className="flex items-center gap-1 truncate">
                              <Mail size={10} /> {(lead as any).email}
                            </div>
                          )}
                          {(lead as any).phone && (
                            <div className="flex items-center gap-1">
                              <Phone size={10} /> {(lead as any).phone}
                            </div>
                          )}
                        </div>
                      )}

                      {lead.nextAction && (
                        <p className="text-[11px] text-neutral-600 line-clamp-2 leading-relaxed">
                          {lead.nextAction}
                        </p>
                      )}

                      {(lead as any).followUpDate && (
                        <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
                          <Calendar size={10} /> Next: {(lead as any).followUpDate}
                        </div>
                      )}

                      {canManage && (
                        <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
                          <button
                            onClick={() => onEdit(lead)}
                            className="text-[10px] font-semibold text-neutral-500 hover:text-black"
                          >
                            Edit
                          </button>

                          <select aria-label={`Status for ${lead.name}`} value={lead.status} onChange={event => onStatusChange(lead.id, event.target.value)} className="min-w-0 max-w-full text-xs bg-white border rounded-lg">
                            {STAGES.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
                          </select>
                          <button className="action" onClick={() => onRemove(lead)}>Delete</button>
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
