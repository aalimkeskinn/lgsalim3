import React from 'react';

export type BadgeKey = 'first_test' | 'five_tests' | 'seven_day_streak';

export interface BadgesBarProps {
  earned: BadgeKey[];
  compact?: boolean;
  showLocked?: boolean; // if false, show only earned badges
}

type Meta = {
  label: string;
  description: string;
  icon: string; // emoji or small glyph
  earnedClasses: string; // classes for earned state
  iconBg: string; // bg color behind icon
};

const BADGE_META: Record<BadgeKey, Meta> = {
  first_test: {
    label: 'İlk Test',
    description: 'İlk test kaydını ekledin',
    icon: '🏁',
    earnedClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBg: 'bg-emerald-100',
  },
  five_tests: {
    label: '5 Test',
    description: 'Toplam 5 test kaydına ulaştın',
    icon: '🎯',
    earnedClasses: 'bg-sky-50 text-sky-700 border-sky-200',
    iconBg: 'bg-sky-100',
  },
  seven_day_streak: {
    label: '7 Gün Seri',
    description: 'Son 7 günde her gün test ekledin',
    icon: '🔥',
    earnedClasses: 'bg-amber-50 text-amber-700 border-amber-200',
    iconBg: 'bg-amber-100',
  },
};

const BadgesBar: React.FC<BadgesBarProps> = ({ earned, compact = true, showLocked = true }) => {
  const all: BadgeKey[] = ['first_test', 'five_tests', 'seven_day_streak'];
  const size = compact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';
  const iconSize = compact ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {all.map((k) => {
        const meta = BADGE_META[k];
        const has = earned.includes(k);
        if (!has && !showLocked) return null;
        const base = 'inline-flex items-center gap-1 border rounded-full transition-colors';
        const state = has ? meta.earnedClasses : 'bg-gray-50 text-gray-400 border-gray-200';
        return (
          <span
            key={k}
            className={`${base} ${state} ${size}`}
            aria-label={`${meta.label} — ${has ? 'Kazanıldı' : 'Kilitli'}`}
            title={`${meta.label} • ${meta.description}`}
          >
            <span className={`inline-flex items-center justify-center ${iconSize} rounded-full ${has ? meta.iconBg : 'bg-gray-200'}`} aria-hidden>
              <span className={compact ? 'text-[11px]' : 'text-sm'}>{meta.icon}</span>
            </span>
            <span className="whitespace-nowrap">{meta.label}</span>
          </span>
        );
      })}
    </div>
  );
};

export default BadgesBar;
