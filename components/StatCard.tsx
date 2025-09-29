import React from 'react';
import InfoIcon from './icons/InfoIcon';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  badgeLabel?: React.ReactNode;
  infoTitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, badgeLabel, infoTitle }) => {
  const safeValue = isNaN(Number(value)) ? '0' : Number(value).toLocaleString('tr-TR');
  return (
    <div className="relative bg-white rounded-lg p-2.5 border border-gray-200 shadow-sm overflow-hidden">
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-[9px] uppercase tracking-wide text-gray-500 font-medium">{title}</p>
          {infoTitle && (
            <span title={infoTitle} aria-label={infoTitle} className="text-gray-400 hover:text-gray-600">
              <InfoIcon className="h-3 w-3" />
            </span>
          )}
          {badgeLabel}
        </div>
        <p className="text-lg font-extrabold text-gray-900 mt-0.5">{safeValue}</p>
      </div>

      <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
        {icon}
      </div>
    </div>
  );
};

export default StatCard;