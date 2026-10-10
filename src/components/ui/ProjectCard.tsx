import React from 'react';
import { ArrowRight, Folder } from 'lucide-react';
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

  const isOverdue = !!project.deadline && project.deadline < today() && project.progress < 100 && project.category !== "Completed";

  if (layout === 'horizontal') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        aria-label={`Project: ${project.name}, Progress: ${project.progress} percent`}
        className={`han-card han-card-clickable p-4 w-44 flex-shrink-0 flex flex-col justify-between select-none ${className}`}
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-sans font-bold text-sm text-text-primary truncate">{project.name}</h4>
            {isOverdue && (
              <span className="badge-overdue shrink-0 ml-1">Overdue</span>
            )}
          </div>
          <p className="text-xs text-text-muted truncate">{project.subtitle}</p>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1">
            <ProgressBar progress={project.progress} height={4} />
          </div>
          <span className="text-xs font-mono text-text-secondary">{project.progress}%</span>
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
      className={`han-card han-card-clickable p-3.5 w-full flex items-center justify-between gap-3 select-none ${className}`}
    >
      <div className="w-10 h-10 rounded-xl bg-surface border border-border-subtle flex items-center justify-center shrink-0">
        <Folder size={18} className="text-text-secondary" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-sans font-bold text-sm text-text-primary truncate">{project.name}</h4>
          {isOverdue && (
            <span className="badge-overdue shrink-0">Overdue</span>
          )}
        </div>
        <p className="text-xs text-text-muted truncate mt-0.5">{project.subtitle}</p>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1">
            <ProgressBar progress={project.progress} height={4} />
          </div>
          <span className="text-xs font-mono text-text-secondary">{project.progress}%</span>
        </div>
      </div>

      <div className="flex-shrink-0 text-text-secondary">
        <ArrowRight size={18} strokeWidth={2} />
      </div>
    </div>
  );
};
