import React from 'react';
import GlobeIcon from './icons/GlobeIcon';
import UserIcon from './icons/UserIcon';

export type ScopeType = 'self' | 'school';

interface ScopeBadgeProps {
  scope: ScopeType;
  showText?: boolean;
  className?: string;
}

const ScopeBadge: React.FC<ScopeBadgeProps> = ({ scope, showText = false, className }) => {
  const isSchool = scope === 'school';
  const Icon = isSchool ? GlobeIcon : UserIcon;
  const label = isSchool ? 'Okul geneli' : 'Kendim';

  return (
    <span
      title={label}
      className={
        className ||
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] ' +
          (isSchool
            ? 'bg-sky-50 text-sky-700 border-sky-100'
            : 'bg-emerald-50 text-emerald-700 border-emerald-100')
      }
    >
      <Icon className="h-3.5 w-3.5" />
      {showText && <span>{label}</span>}
    </span>
  );
};

export default ScopeBadge;
