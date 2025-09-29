import React, { useMemo } from 'react';
import { TestResult } from '../types';

interface InsightsCardsProps {
  data: TestResult[]; // all test results
  currentUserId: string;
  compact?: boolean;
}

const InsightsCards: React.FC<InsightsCardsProps> = ({ data, currentUserId, compact = false }) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const userData = useMemo(() => data.filter(r => r.kullaniciId === currentUserId && r.createdAt), [data, currentUserId]);

  // Streak: consecutive days with at least one test (user)
  const streak = useMemo(() => {
    const set = new Set<string>();
    userData.forEach(r => {
      const dt = new Date(r.createdAt!.toDate());
      const key = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).toISOString().slice(0, 10);
      set.add(key);
    });
    let count = 0;
    for (let i = 0; i < 30; i++) { // look back up to 30 days
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
      if (set.has(key)) count++; else break;
    }
    return count;
  }, [userData, today]);

  const achieved = streak >= 7;
  const streakPct = Math.min(100, Math.round((streak / 7) * 100));

  return (
    <div className={`bg-white ${compact ? 'p-2' : 'p-2.5'} rounded-lg border border-gray-200 shadow-sm h-full`}>
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-[10px] font-semibold text-gray-900">Peş Peşe Gün</h3>
        {!compact && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">Motivasyon</span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className={`font-semibold text-gray-900 ${compact ? 'text-[12px]' : 'text-xs'}`}>{streak} gün</p>
          <p className="text-[10px] text-gray-500">Hedef: 7 gün</p>
        </div>
        <div className={`${compact ? 'w-6 h-6' : 'w-7 h-7'} rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center`}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`}>
            <path d="M12 2v4" />
            <path d="M12 22v-6" />
            <path d="M4.93 4.93l2.83 2.83" />
            <path d="M16.24 16.24l2.83 2.83" />
            <path d="M2 12h4" />
            <path d="M18 12h4" />
            <path d="M4.93 19.07l2.83-2.83" />
            <path d="M16.24 7.76l2.83-2.83" />
          </svg>
        </div>
      </div>
      <div className={`mt-2 ${compact ? 'h-1' : 'h-1.5'} w-full bg-gray-100 rounded-md overflow-hidden`}>
        <div className={`${compact ? 'h-1' : 'h-1.5'} ${achieved ? 'bg-amber-500' : streak > 0 ? 'bg-emerald-500' : 'bg-gray-300'}`} style={{ width: `${streak > 0 ? streakPct : 5}%` }} />
      </div>
      {achieved ? (
        <div className={`mt-2 inline-flex items-center gap-1.5 ${compact ? 'px-1 py-0.5' : 'px-1.5 py-0.5'} rounded-md bg-amber-50 text-amber-700 border border-amber-200`}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`}>
            <path d="M8 21h8" />
            <path d="M12 17v4" />
            <path d="M7 4h10v5a5 5 0 01-10 0V4z" />
            <path d="M17 5h2a3 3 0 010 6h-2" />
            <path d="M7 5H5a3 3 0 000 6h2" />
          </svg>
          <span className="text-[10px] font-medium">Tebrikler! 7 günlük seri rozeti kazandın.</span>
        </div>
      ) : (
        <p className="mt-1.5 text-[10px] text-gray-500">Her gün bir test ekleyerek 7 günlük seriyi tamamla, rozeti kap.</p>
      )}
    </div>
  );
};

export default InsightsCards;
