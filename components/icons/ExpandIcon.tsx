import React from 'react';

const ExpandIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className || 'h-5 w-5'}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 4L4 8M16 4l4 4M8 20l-4-4M16 20l4-4" />
  </svg>
);

export default ExpandIcon;
