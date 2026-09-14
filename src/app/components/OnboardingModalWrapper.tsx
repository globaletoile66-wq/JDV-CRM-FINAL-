'use client';

import React, { useEffect, useState } from 'react';
import OnboardingModal from './OnboardingModal';

export default function OnboardingModalWrapper() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
    };

    const buttonIds = [
      'hero-register-btn',
      'open-onboarding',
      'pricing-register-btn',
    ];

    const buttons = buttonIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    buttons.forEach((button) => {
      button.addEventListener('click', handleOpen);
    });

    return () => {
      buttons.forEach((button) => {
        button.removeEventListener('click', handleOpen);
      });
    };
  }, []);

  return (
    <OnboardingModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
    />
  );
}
