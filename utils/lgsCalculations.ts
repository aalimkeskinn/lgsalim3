import { LGS_COURSE_INFO } from '../data/topics';

export const calculateNet = (correct: number, wrong: number): number => {
  return Math.max(0, correct - (wrong / 3));
};

export const calculateSuccessRate = (correct: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
};

interface BranchScores {
  correct: number;
  wrong: number;
  empty: number;
}

export const calculateLGSScore = (branches: Record<string, BranchScores>): number => {
  let totalWeightedNet = 0;

  Object.entries(branches).forEach(([branch, scores]) => {
    const info = LGS_COURSE_INFO[branch];
    if (!info) return;

    const net = calculateNet(scores.correct, scores.wrong);
    totalWeightedNet += net * info.weight;
  });

  return Math.round(totalWeightedNet * 10) / 10;
};

export const calculateTotalQuestions = (branches: Record<string, BranchScores>): number => {
  return Object.values(branches).reduce((sum, scores) => {
    return sum + scores.correct + scores.wrong + scores.empty;
  }, 0);
};

export const getPerformanceLevel = (successRate: number): 'low' | 'medium' | 'high' => {
  if (successRate >= 75) return 'high';
  if (successRate >= 50) return 'medium';
  return 'low';
};

export const getColorByPerformance = (successRate: number): string => {
  if (successRate >= 75) return 'text-emerald-700';
  if (successRate >= 50) return 'text-amber-700';
  return 'text-rose-700';
};

export const getBgColorByPerformance = (successRate: number): string => {
  if (successRate >= 75) return 'bg-emerald-500';
  if (successRate >= 50) return 'bg-amber-500';
  return 'bg-rose-500';
};
