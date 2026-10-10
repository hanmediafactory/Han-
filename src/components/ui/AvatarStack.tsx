import React from 'react';

interface AvatarStackProps {
  names: string[];
  maxDisplay?: number;
  className?: string;
}

export const AvatarStack: React.FC<AvatarStackProps> = ({
  names,
  maxDisplay = 3,
  className = '',
}) => {
  const displayed = names.slice(0, maxDisplay);
  const remaining = names.length - maxDisplay;

  return (
    <div className={`flex items-center -space-x-2 ${className}`}>
      {displayed.map((name, index) => {
        const initial = name.charAt(0).toUpperCase();
        return (
          <div
            key={index}
            className="w-8 h-8 rounded-full bg-page text-text-primary border-2 border-white flex items-center justify-center font-bold text-xs font-sans shadow-sm"
          >
            {initial}
          </div>
        );
      })}
      {remaining > 0 && (
        <div className="w-8 h-8 rounded-full bg-gray-100 text-text-primary border-2 border-white flex items-center justify-center font-bold text-xs font-sans shadow-sm">
          +{remaining}
        </div>
      )}
    </div>
  );
};
