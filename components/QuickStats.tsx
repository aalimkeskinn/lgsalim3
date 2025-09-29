import React from 'react';
import { TestResult } from '../types';

interface QuickStatsProps {
  data: TestResult[];
  currentUserId: string;
}

const QuickStats: React.FC<QuickStatsProps> = ({ data, currentUserId }) => {
  const userData = data.filter(r => r.kullaniciId === currentUserId);
  
  const stats = {
    totalTests: userData.length,
    avgSuccess: userData.length > 0 
      ? Math.round(
          userData.reduce((sum, r) => {
            const total = r.dogruSayisi + r.yanlisSayisi + r.bosSayisi;
            const netCorrect = r.dogruSayisi - r.yanlisSayisi / 4;
            return sum + (total > 0 ? (Math.max(0, netCorrect) / total) * 100 : 0);
          }, 0) / userData.length
        )
      : 0,
    bestStreak: 0, // Bu hesaplama daha karmaşık olabilir
    totalQuestions: userData.reduce((sum, r) => sum + r.dogruSayisi + r.yanlisSayisi + r.bosSayisi, 0)
  };

  return (
    <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-[10px] font-semibold text-gray-900 mb-2">Hızlı İstatistikler</h3>
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[9px] text-gray-600">Ortalama Başarı</span>
          <span className="text-[10px] font-semibold text-gray-900">{stats.avgSuccess}%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[9px] text-gray-600">Toplam Test</span>
          <span className="text-[10px] font-semibold text-gray-900">{stats.totalTests}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[9px] text-gray-600">Toplam Soru</span>
          <span className="text-[10px] font-semibold text-gray-900">{stats.totalQuestions}</span>
        </div>
      </div>
    </div>
  );
};

export default QuickStats;
