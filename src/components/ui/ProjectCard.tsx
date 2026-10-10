import React from 'react';
import { ArrowRight, Folder, AlertCircle } from 'lucide-react';
import type { Project } from '../../types';
import { ProgressBar } from './ProgressBar';
import { today } from '../../context/dates';

interface ProjectCardProps {
  project: Project;
  layout?: 'horizontal' | 'vertical' | 'list';
  onClick?: () => void;
  className?: string;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  layout = 'list',
  onClick,
  className = '',
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  const isOverdue = project.deadline < today() && project.progress < 100;



  if (layout === 'horizontal') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        aria-label={`Project: ${project.name}, Progress: ${project.progress} percent`}
        className={`han-card han-card-clickable p-4 w-44 flex-shrink-0 flex flex-col justify-between select-none ${className}`}
        style={{ borderRadius: '18px', background: '#FFFFFF', border: isOverdue ? '1.5px solid #000000' : '1px solid #ECECEC' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-black">
            <Folder size={16} strokeWidth={2} />
          </div>
          <span className="text-xs font-bold font-sans text-black">{project.progress}%</span>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h4 className="font-sans font-bold text-sm text-black truncate">{project.name}</h4>
            {isOverdue && <AlertCircle size={14} className="text-black shrink-0" />}
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5">{project.subtitle}</p>
        </div>

        <div className="mt-3">
          <ProgressBar progress={project.progress} height={4} />
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={`Project: ${project.name}, Progress: ${project.progress} percent`}
      className={`han-card han-card-clickable p-4 w-full flex items-center justify-between select-none ${className}`}
      style={{ borderRadius: '18px', background: '#FFFFFF', border: isOverdue ? '1.5px solid #000000' : '1px solid #ECECEC' }}
    >
      <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
        <div className="w-10 h-10 rounded-2xl bg-gray-100 flex-shrink-0 flex items-center justify-center text-black border border-gray-200">
          <Folder size={18} strokeWidth={2} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <h4 className="font-sans font-bold text-sm text-black truncate">{project.name}</h4>
              {isOverdue && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black text-white font-bold shrink-0">
                  Overdue
                </span>
              )}
            </div>
            <span className="text-xs font-bold font-sans text-black ml-2">{project.progress}%</span>
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5">{project.subtitle}</p>

          <div className="mt-2.5">
            <ProgressBar progress={project.progress} height={5} />
          </div>
        </div>
      </div>

      <div className="ml-2 flex-shrink-0 text-gray-400">
        <ArrowRight size={18} strokeWidth={2} />
      </div>
    </div>
  );
};
