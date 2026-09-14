'use client';

import React, { memo } from 'react';

import AppIcon from './AppIcon';
import AppImage from './AppImage';

interface AppLogoProps {
  src?: string;
  iconName?: string;
  size?: number;
  className?: string;
  onClick?: () => void;
  alt?: string;
}

const AppLogo = memo(function AppLogo({
  src = '/assets/images/app_logo.png',
  iconName = 'SparklesIcon',
  size = 64,
  className = '',
  onClick,
  alt = 'JDV CRM',
}: AppLogoProps) {
  const isClickable = typeof onClick === 'function';

  const containerClassName = [
    'inline-flex',
    'items-center',
    'justify-center',
    isClickable
      ? 'cursor-pointer hover:opacity-90 transition-opacity duration-200' :'',
    'focus:outline-none',
    isClickable
      ? 'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#D4AF37]'
      : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = src ? (
    <AppImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="block flex-shrink-0 object-contain"
      priority
      unoptimized={src.toLowerCase().endsWith('.svg')}
    />
  ) : (
    <AppIcon
      name={iconName}
      size={size}
      className="flex-shrink-0"
      aria-label={alt}
    />
  );

  if (isClickable) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={containerClassName}
        aria-label={alt}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={containerClassName}
      role="img"
      aria-label={alt}
    >
      {content}
    </div>
  );
});

AppLogo.displayName = 'AppLogo';

export default AppLogo;
