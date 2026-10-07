import React from 'react';
import type { Task } from '../../types';

interface TimelineProps {
  tasks: Task[];
  onToggleTask?: (id: string) => void;
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ tasks, onToggleTask, className = '' }) => {
  return (
    <div className={`w-full flex flex-col gap-3.5 relative pl-4 border-l border-gray-200 ${className}`}>
      {tasks.map((task, idx) => (
        <div
          key={task.id || idx}
          onClick={() => onToggleTask && onToggleTask(task.id)}
          className="relative flex items-start gap-3 cursor-pointer group"
        >
          {/* Dot indicator on timeline */}
          <div
            className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white transition-all ${
              task.completed ? 'bg-black ring-2 ring-black/20' : 'bg-gray-300'
            }`}
          />

          <div className="flex-1 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm transition-all group-active:scale-[0.99]">
            <div className="flex items-center justify-between">
              <h5
                className={`font-sans font-bold text-sm ${
                  task.completed ? 'line-through text-gray-400' : 'text-black'
                }`}
              >
                {task.title}
              </h5>
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                {task.timeSlot}
              </span>
            </div>
            {task.projectName && (
              <p className="text-xs text-gray-500 mt-1 font-medium">{task.projectName}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
