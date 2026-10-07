import React from 'react';
import type { Lead } from '../../types';
import { Building2 } from 'lucide-react';

interface LeadCardProps {
  lead: Lead;
  onStatusChange?: (id: string, status: Lead['status']) => void;
  className?: string;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, className = '' }) => {
  const getBadgeStyle = (status: Lead['status']) => {
    switch (status) {
      case 'New':
        return 'bg-black text-white';
      case 'Contacted':
        return 'bg-gray-200 text-gray-800';
      case 'Interested':
        return 'bg-gray-100 border border-black text-black font-bold';
      case 'Follow Up':
        return 'bg-gray-900 text-white';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div
      className={`w-full flex items-center justify-between p-4 rounded-2xl bg-white border border-gray-100 shadow-sm ${className}`}
    >
      <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
        <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-black flex-shrink-0">
          <Building2 size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-sans font-bold text-sm text-black truncate">{lead.name}</h4>
          <p className="text-xs text-gray-500 mt-0.5">{lead.category}</p>
        </div>
      </div>

      <div className="flex-shrink-0">
        <span className={`text-xs px-3 py-1.5 rounded-full font-sans font-medium ${getBadgeStyle(lead.status)}`}>
          {lead.status}
        </span>
      </div>
    </div>
  );
};
