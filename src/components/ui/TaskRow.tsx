import React from 'react';
import { Check } from 'lucide-react';
import type { Task } from '../../types';
import { formatTaskAudit } from '../../utils/display';

interface TaskRowProps {
  task: Task;
  onToggle: (id: string) => void;
  onUpdateProgress?: (id: string, progress: number) => void;
  className?: string;
}

export const TaskRow: React.FC<TaskRowProps> = ({ task, onToggle, onUpdateProgress, className = '' }) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle(task.id);
    }
  };

  const progress = task.progress !== undefined ? task.progress : (task.completed ? 100 : 0);
  const audit = formatTaskAudit(task);

  const statusLabel = task.completed
    ? 'Completed'
    : task.status === 'IN_PROGRESS'
      ? 'In Progress'
      : task.status === 'CANCELLED'
        ? 'Cancelled'
        : 'To Do';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onToggle(task.id)}
      onKeyDown={handleKeyDown}
      aria-label={`Task: ${task.title}, Progress: ${progress}%, Status: ${statusLabel}`}
      className={`w-full flex flex-col p-3.5 rounded-2xl bg-page border border-gray-100 shadow-sm cursor-pointer select-none hover:border-neutral-300 hover:shadow-md active:scale-[0.99] transition-all duration-200 group ${className}`}
    >
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(task.id);
            }}
            className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-200 cursor-pointer ${
              task.completed
                ? 'bg-page text-text-primary border-none scale-105 shadow-sm'
                : 'bg-transparent border-2 border-gray-300 hover:border-black hover:scale-110'
            }`}
            aria-label={task.completed ? 'Mark task incomplete' : 'Mark task completed'}
          >
            {task.completed && <Check size={15} strokeWidth={3} />}
          </button>

          <div className="flex-1 min-w-0">
            <h4
              className={`font-sans font-medium text-sm transition-all duration-200 ${
                task.completed ? 'line-through text-gray-400 font-normal' : 'text-text-primary font-bold group-hover:text-text-secondary'
              }`}
            >
              {task.title}
            </h4>
            <p className="text-xs text-gray-500 mt-0.5 font-sans flex items-center gap-1.5 flex-wrap">
              <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-md font-bold ${
                task.completed ? 'bg-surface-elevated text-text-muted' : task.status === 'IN_PROGRESS' ? 'bg-page text-text-primary' : 'bg-surface-elevated text-neutral-700'
              }`}>{statusLabel}</span>
              <span className="text-[11px] font-mono font-semibold text-text-secondary">· {progress}%</span>
              {task.assignedUserName && <span className="text-neutral-600 font-medium">· Assigned to {task.assignedUserName}</span>}
              {task.timeSlot && <span className="font-mono">· {task.timeSlot}</span>}
              {task.projectName && <span className="text-gray-400">· {task.projectName}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Progress Bar & Quick Adjust */}
      <div className="mt-2.5 pt-2 border-t border-border-subtle/50 flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 bg-surface-elevated rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${task.completed ? 'bg-neutral-400' : 'bg-page'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-text-muted shrink-0">{progress}%</span>
        </div>

        {/* Audit info: who updated the task progress and when */}
        {audit && (
          <div className="flex items-center justify-between text-[10px] text-text-muted pt-0.5">
            <span className="flex items-center gap-1.5 font-sans">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${task.completed ? 'bg-emerald-500' : progress > 0 ? 'bg-blue-500' : 'bg-neutral-400'}`} />
              {audit.text}
            </span>
            {audit.time && <span className="font-mono text-[9px] text-text-muted">{audit.time}</span>}
          </div>
        )}

        {onUpdateProgress && (
          <div className="flex items-center gap-1 justify-end flex-wrap pt-0.5">
            <span className="text-[9px] uppercase font-mono text-text-muted mr-1">Progress:</span>
            {[0, 25, 50, 75, 100].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => onUpdateProgress(task.id, step)}
                className={`text-[10px] px-2 py-0.5 rounded-md font-mono transition-all cursor-pointer ${
                  progress === step
                    ? 'bg-page text-text-primary font-bold border border-border-strong shadow-xs'
                    : 'bg-surface-elevated text-text-secondary hover:text-text-primary hover:bg-surface-overlay'
                }`}
              >
                {step}%
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
