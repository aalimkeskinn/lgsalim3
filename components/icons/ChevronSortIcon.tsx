import React from 'react';
import type { TestResult } from '../types';

interface ChevronSortIconProps {
  columnKey: keyof TestResult;
  sortConfig: { key: keyof TestResult; direction: 'ascending' | 'descending' } | null;
}

const ChevronSortIcon: React.FC<ChevronSortIconProps> = ({ columnKey, sortConfig }) => {
  const isSorting = sortConfig?.key === columnKey;
  const isAscending = isSorting && sortConfig?.direction === 'ascending';
  const isDescending = isSorting && sortConfig?.direction === 'descending';

  const ascColor = isAscending ? 'text-gray-900' : 'text-gray-400';
  const descColor = isDescending ? 'text-gray-900' : 'text-gray-400';

  return (
    <span className="inline-flex flex-col -space-y-1.5 ml-1">
      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${ascColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${descColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </span>
  );
};

export default ChevronSortIcon;
