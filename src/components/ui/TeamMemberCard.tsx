import React from 'react';
import type { TeamMember } from '../../types';

interface TeamMemberCardProps {
  member: TeamMember;
  className?: string;
}

export const TeamMemberCard: React.FC<TeamMemberCardProps> = ({ member, className = '' }) => {
  return (
    <div
      className={`w-full flex items-center justify-between p-4 rounded-2xl bg-white border border-gray-100 shadow-sm ${className}`}
    >
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm font-sans tracking-wide">
          {member.initials}
        </div>
        <div>
          <h4 className="font-sans font-bold text-sm text-black">{member.name}</h4>
          <p className="text-xs text-gray-500 mt-0.5">{member.role}</p>
        </div>
      </div>

      {member.sharePercentage && (
        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full font-sans">
          {member.sharePercentage}
        </span>
      )}
    </div>
  );
};
