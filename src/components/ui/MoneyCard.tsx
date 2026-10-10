import React from 'react';

interface MoneyCardProps {
  amount: number;
  growthPercentage?: string;
  onClick?: () => void;
  className?: string;
}

export const MoneyCard: React.FC<MoneyCardProps> = ({
  amount,
  growthPercentage = 'Available for salaries and expenses · savings excluded',
  onClick,
  className = '',
}) => {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={`Spendable funds: ₹${amount.toLocaleString('en-IN')}`}
      className={`han-card dark han-card-clickable p-5 relative overflow-hidden select-none cursor-pointer ${className}`}
      style={{
        background: '#000000',
        borderRadius: '20px',
        border: '1px solid #1F1F1F',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-gray-400">
            Spendable funds
          </span>
          <h2 className="text-2xl font-bold font-sans mt-1 text-text-primary tracking-tight">
            ₹{amount.toLocaleString('en-IN')}
          </h2>
          <div className="flex items-center gap-1 mt-2 text-xs font-medium text-gray-400">
            <span>{growthPercentage}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
