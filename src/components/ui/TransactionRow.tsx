import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { Expense } from '../../types';

interface TransactionRowProps {
  transaction: Expense;
  className?: string;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({ transaction, className = '' }) => {
  const isIncome = transaction.type === 'income';

  return (
    <div
      className={`w-full flex items-center justify-between p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm ${className}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
            isIncome ? 'bg-black text-white' : 'bg-gray-100 text-black'
          }`}
        >
          {isIncome ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
        </div>
        <div>
          <h5 className="font-sans font-bold text-sm text-black">{transaction.title}</h5>
          <p className="text-xs text-gray-500 mt-0.5">{transaction.date}</p>
        </div>
      </div>

      <div className="text-right">
        <span
          className={`font-sans font-bold text-sm ${
            isIncome ? 'text-black font-extrabold' : 'text-black'
          }`}
        >
          {isIncome ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN')}
        </span>
        {transaction.notes && (
          <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[120px]">
            {transaction.notes}
          </p>
        )}
      </div>
    </div>
  );
};
