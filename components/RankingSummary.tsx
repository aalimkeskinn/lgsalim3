import React, { useMemo } from 'react';
import { TestResult } from '../types';

interface RankingSummaryProps {
  data: TestResult[];
  currentUserId: string;
}

// Calculates per-subject ranking of the current user among all users
// based on aggregate success rate (netCorrect / totalQuestions) across that subject.
const RankingSummary: React.FC<RankingSummaryProps> = ({ data, currentUserId }) => {
  type Agg = { totalCorrect: number; totalWrong: number; totalEmpty: number };

  const subjectRankings = useMemo(() => {
    // subject -> userId -> aggregate
    const bySubject: Record<string, Record<string, Agg>> = {};

    data.forEach(r => {
      const subject = r.dersAdi;
      if (!bySubject[subject]) bySubject[subject] = {};
      if (!bySubject[subject][r.kullaniciId]) bySubject[subject][r.kullaniciId] = { totalCorrect: 0, totalWrong: 0, totalEmpty: 0 };
      bySubject[subject][r.kullaniciId].totalCorrect += (r.dogruSayisi || 0);
      bySubject[subject][r.kullaniciId].totalWrong += (r.yanlisSayisi || 0);
      bySubject[subject][r.kullaniciId].totalEmpty += (r.bosSayisi || 0);
    });

    // For each subject, compute success rate per user and rank
    const result: Array<{ subject: string; rank: number; total: number; successRate: number | null }> = [];

    Object.keys(bySubject).forEach(subject => {
      const perUser = bySubject[subject];
      const entries = Object.keys(perUser).map(uid => {
        const { totalCorrect, totalWrong, totalEmpty } = perUser[uid];
        const totalQuestions = totalCorrect + totalWrong + totalEmpty;
        const netCorrect = totalCorrect - totalWrong / 4;
        const successRate = totalQuestions > 0 ? (Math.max(0, netCorrect) / totalQuestions) : 0;
        return { uid, successRate };
      });

      // Sort desc by successRate
      entries.sort((a, b) => b.successRate - a.successRate);

      const total = entries.length;
      const idx = entries.findIndex(e => e.uid === currentUserId);
      if (idx !== -1) {
        result.push({ subject, rank: idx + 1, total, successRate: Math.round(entries[idx].successRate * 100) });
      } else {
        // current user has no entries for this subject
        result.push({ subject, rank: NaN, total, successRate: null });
      }
    });

    // stable sort by subject name
    result.sort((a, b) => a.subject.localeCompare(b.subject));
    return result;
  }, [data, currentUserId]);

  if (subjectRankings.length === 0) return null;

  return (
    <div className="bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm h-full">
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-[10px] font-semibold text-gray-900">Ders Bazlı Sıralaman</h3>
        <div className="flex items-center gap-1">
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100">Okul geneli</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">Güncel</span>
        </div>
      </div>
      <p className="text-[9px] text-gray-500 mb-2">Bu sıralama, okul genelindeki tüm kullanıcıların sonuçlarına göre hesaplanır.</p>
      <div className="flex items-center justify-end mb-1.5">
        <span className="text-[9px] text-gray-400 mr-1">Kaydır</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 text-gray-400">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L9.586 11 7.293 8.707a1 1 0 111.414-1.414l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="relative">
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* hide scrollbar for WebKit */}
          <style>{`.no-scrollbar::-webkit-scrollbar{display:none}`}</style>
          {subjectRankings.map((item) => {
            const hasData = !Number.isNaN(item.rank);
            const pct = typeof item.successRate === 'number' ? Math.max(0, Math.min(100, item.successRate)) : 0;
            const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-500';
            return (
              <div key={item.subject} className="rounded-lg border border-gray-200 p-2 bg-white min-w-[180px]">
                <div className="flex items-center justify-between gap-1.5">
                  <p className="text-[10px] font-medium text-gray-800 truncate">{item.subject}</p>
                  {hasData ? (
                    <span className="shrink-0 text-[10px] font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded-md px-1.5 py-0.5">#{item.rank} / {item.total}</span>
                  ) : (
                    <span className="shrink-0 text-[10px] text-gray-500">Henüz veri yok</span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <div className="w-full h-1 bg-gray-100 rounded-md overflow-hidden">
                    <div className={`h-1 ${barColor} rounded-md`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-[10px] text-gray-600">%{pct}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="pointer-events-none absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-white to-transparent rounded-r-xl" />
      </div>
    </div>
  );
};

export default RankingSummary;
