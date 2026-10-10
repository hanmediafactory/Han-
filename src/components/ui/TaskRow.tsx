import React from 'react';
import { Check } from 'lucide-react';
import type { Task } from '../../types';

interface TaskRowProps {
  task: Task;
  onToggle: (id: string) => void;
  className?: string;
}

export const TaskRow: React.FC<TaskRowProps> = ({ task, onToggle, className = '' }) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle(task.id);
    }
  };

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
      aria-label={`Task: ${task.title}, Status: ${statusLabel}`}
      className={`w-full flex items-center justify-between p-3.5 rounded-2xl bg-page border border-gray-100 shadow-sm cursor-pointer select-none hover:border-neutral-300 hover:shadow-md active:scale-[0.99] transition-all duration-200 group ${className}`}
    >
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
          <p className="text-xs text-gray-500 mt-0.5 font-sans flex items-center gap-1.5">
            <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-md font-bold ${
              task.completed ? 'bg-surface-elevated text-text-muted' : task.status === 'IN_PROGRESS' ? 'bg-page text-text-primary' : 'bg-surface-elevated text-neutral-700'
            }`}>{statusLabel}</span>
            {task.timeSlot && <span className="font-mono">· {task.timeSlot}</span>}
            {task.projectName && <span className="text-gray-400">· {task.projectName}</span>}
          </p>
        </div>
      </div>
    </div>
  );
};
