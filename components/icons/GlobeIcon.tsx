import React from 'react';

const GlobeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className || 'h-4 w-4'}
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c2.5 3 2.5 15 0 18" />
    <path d="M7 5c1 .8 2.5 3.5 2.5 7S8 18.2 7 19" />
    <path d="M17 5c-1 .8-2.5 3.5-2.5 7S16 18.2 17 19" />
  </svg>
);

export default GlobeIcon;
