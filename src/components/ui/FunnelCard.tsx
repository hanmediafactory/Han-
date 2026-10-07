import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { Funnel } from '../../types';
import { ProgressBar } from './ProgressBar';

interface FunnelCardProps {
  funnel: Funnel;
  onClick?: () => void;
  className?: string;
}

export const FunnelCard: React.FC<FunnelCardProps> = ({ funnel, onClick, className = '' }) => {
  const percentage = Math.round((funnel.completedDaysOrSteps / funnel.totalDaysOrSteps) * 100);

  return (
    <div
      onClick={onClick}
      className={`relative w-full rounded-2xl overflow-hidden p-6 text-white cursor-pointer select-none active:scale-[0.985] transition-all shadow-lg ${className}`}
      style={{
        background: '#0A0A0A',
        minHeight: '170px',
      }}
    >
      {/* Background Image Overlay */}
      {funnel.imageBg && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity grayscale filter"
          style={{ backgroundImage: `url(${funnel.imageBg})` }}
        />
      )}

      {/* Subtle top shadow gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />

      <div className="relative z-10 flex flex-col justify-between h-full min-h-[140px]">
        <div>
          <h3 className="font-serif text-2xl font-bold tracking-tight text-white">
            {funnel.title}
          </h3>
          <p className="text-xs text-gray-400 mt-1.5 font-sans font-medium line-clamp-1">
            {funnel.subtitle}
          </p>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-xs font-semibold font-sans mb-2 text-gray-300">
            <span>
              {funnel.completedDaysOrSteps}/{funnel.totalDaysOrSteps}{' '}
              {funnel.id === 'funnel-1' ? 'days' : 'steps'}
            </span>
            <div className="flex items-center gap-1 text-white font-bold">
              <span>View Details</span>
              <ArrowRight size={14} />
            </div>
          </div>
          <ProgressBar progress={percentage} height={5} lightBackground />
        </div>
      </div>
    </div>
  );
};
