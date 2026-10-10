import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 to 100
  height?: number;
  lightBackground?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 6,
  lightBackground = false,
  className = '',
}) => {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div
      className={`w-full overflow-hidden rounded-full ${className}`}
      style={{
        height,
        backgroundColor: lightBackground ? 'rgba(255, 255, 255, 0.2)' : 'var(--border-subtle)',
      }}
    >
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{
          width: `${clamped}%`,
          backgroundColor: lightBackground ? '#FFFFFF' : 'var(--text-primary)',
        }}
      />
    </div>
  );
};
