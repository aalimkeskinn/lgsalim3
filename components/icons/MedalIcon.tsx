import React from 'react';

const MedalIcon: React.FC<{ className?: string }>=({ className })=> (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className || 'h-4 w-4'}
    aria-hidden
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M8 12l-2 8 6-3 6 3-2-8" />
  </svg>
);

export default MedalIcon;
