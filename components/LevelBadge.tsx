import React from 'react';
import MedalIcon from './icons/MedalIcon';

interface LevelBadgeProps {
  level?: 'giris' | 'orta' | 'ileri';
  compact?: boolean;
}

const levelText: Record<NonNullable<LevelBadgeProps['level']>, { label: string; bg: string; text: string; border: string }> = {
  giris: { label: 'Giriş Seviyesi', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-100' },
  orta: { label: 'Orta Seviye', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
  ileri: { label: 'İleri Seviye', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
};

const LevelBadge: React.FC<LevelBadgeProps> = ({ level = 'giris', compact = false }) => {
  const s = levelText[level];
  return (
    <div className={`h-full ${s.bg} ${s.text} ${s.border} border rounded-lg shadow-sm ${compact ? 'p-1.5' : 'p-2'} flex items-center gap-1.5 min-w-[120px]`}>
      <div className={`${compact ? 'w-6 h-6' : 'w-7 h-7'} rounded-full bg-white/70 flex items-center justify-center`}>
        <MedalIcon className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
      </div>
      <div className="min-w-0">
        <p className={`font-semibold uppercase opacity-80 ${compact ? 'text-[8px]' : 'text-[9px]'}`}>Üyelik Seviyesi</p>
        <p className={`${compact ? 'text-[11px]' : 'text-xs'} font-semibold truncate`}>{s.label}</p>
      </div>
    </div>
  );
};

export default LevelBadge;
