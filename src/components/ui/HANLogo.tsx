import React from 'react';

interface HANLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  light?: boolean;
  className?: string;
  withContainer?: boolean;
}

export const HANLogo: React.FC<HANLogoProps> = ({
  size = 'md',
  showTagline = false,
  light = false,
  className = '',
  withContainer = false,
}) => {
  const heightClasses = {
    sm: 'h-7',
    md: 'h-11',
    lg: 'h-16',
    xl: 'h-24',
  };

  const imgElement = (
    <img
      src="/logo.png"
      alt="HAN Media Factory"
      className={`${heightClasses[size]} w-auto object-contain select-none`}
      loading="eager"
    />
  );

  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      {withContainer ? (
        <div className="bg-black p-2.5 rounded-2xl border border-neutral-800 shadow-xl inline-flex items-center justify-center">
          {imgElement}
        </div>
      ) : (
        imgElement
      )}
      {showTagline && (
        <p
          className="han-tagline mt-2 text-xs font-semibold tracking-widest uppercase opacity-80"
          style={{
            color: light ? '#A3A3A3' : '#666666',
            letterSpacing: '0.22em',
          }}
        >
          BUILD · EXECUTE · GROW
        </p>
      )}
    </div>
  );
};

