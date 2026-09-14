'use client';

import React from 'react';
import * as HeroIcons from '@heroicons/react/24/outline';
import * as HeroIconsSolid from '@heroicons/react/24/solid';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

type IconVariant = 'outline' | 'solid';

type HeroIconComponent = React.ComponentType<
  React.SVGProps<SVGSVGElement>
>;

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: string;
  variant?: IconVariant;
  size?: number;
  disabled?: boolean;
}

function Icon({
  name,
  variant = 'outline',
  size = 24,
  className = '',
  onClick,
  disabled = false,
  ...props
}: IconProps) {
  const iconSet =
    variant === 'solid'
      ? HeroIconsSolid
      : HeroIcons;

  const IconComponent =
    iconSet[name as keyof typeof iconSet] as
      | HeroIconComponent
      | undefined;

  const disabledClasses = disabled
    ? 'opacity-50 cursor-not-allowed' :'';

  const clickableClasses =
    onClick && !disabled
      ? 'cursor-pointer hover:opacity-80' :'';

  const combinedClassName = [
    disabledClasses,
    clickableClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const commonProps: React.SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    className: combinedClassName,
    'aria-hidden': props['aria-label'] ? undefined : true,
    ...props,
  };

  if (!IconComponent) {
    return (
      <QuestionMarkCircleIcon
        {...commonProps}
        className={[
          'text-gray-400',
          combinedClassName,
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={disabled ? undefined : onClick}
        aria-label={
          props['aria-label'] ?? 'Icône indisponible'
        }
      />
    );
  }

  return (
    <IconComponent
      {...commonProps}
      onClick={disabled ? undefined : onClick}
    />
  );
}

export default Icon;
