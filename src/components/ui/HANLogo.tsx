import React from 'react';

interface HANLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  light?: boolean;
  className?: string;
}

export const HANLogo: React.FC<HANLogoProps> = ({
  size = 'md',
  showTagline = false,
  light = false,
  className = '',
}) => {
  const fontSizes = {
    sm: '1.25rem',
    md: '1.75rem',
    lg: '2.5rem',
    xl: '4.5rem',
  };

  const letterSpacing = {
    sm: '0.12em',
    md: '0.15em',
    lg: '0.18em',
    xl: '0.25em',
  };

  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <h1
        className="font-serif font-semibold leading-none tracking-widest"
        style={{
          fontSize: fontSizes[size],
          letterSpacing: letterSpacing[size],
          color: light ? '#FFFFFF' : '#000000',
        }}
      >
        HAN
      </h1>
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
