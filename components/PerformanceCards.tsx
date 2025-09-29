
import React from 'react';
import { TestResult } from '../types';

interface PerformanceCardsProps {
  data: TestResult[];
  scopeBadge?: React.ReactNode;
}

const PerformanceCards: React.FC<PerformanceCardsProps> = ({ data, scopeBadge }) => {
  const getPerformanceData = () => {
    const courseData: { [key: string]: { totalCorrect: number; totalWrong: number; totalQuestions: number } } = {};

    data.forEach(result => {
      if (!courseData[result.dersAdi]) {
        courseData[result.dersAdi] = { totalCorrect: 0, totalWrong: 0, totalQuestions: 0 };
      }
      courseData[result.dersAdi].totalCorrect += result.dogruSayisi;
      courseData[result.dersAdi].totalWrong += result.yanlisSayisi;
      courseData[result.dersAdi].totalQuestions += result.dogruSayisi + result.yanlisSayisi + result.bosSayisi;
    });

    const courseSuccessRates = Object.keys(courseData).map(course => {
      const { totalCorrect, totalWrong, totalQuestions } = courseData[course];
      const netCorrect = totalCorrect - totalWrong / 4;
      const successRate = totalQuestions > 0 ? Math.round((Math.max(0, netCorrect) / totalQuestions) * 100) : 0;
      return {
        course,
        successRate,
      };
    });

    if (courseSuccessRates.length === 0) {
      return { bestCourse: null, worstCourse: null };
    }

    const sortedCourses = courseSuccessRates.sort((a, b) => b.successRate - a.successRate);

    return {
      bestCourse: sortedCourses[0],
      worstCourse: sortedCourses[sortedCourses.length - 1],
    };
  };

  const { bestCourse, worstCourse } = getPerformanceData();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {bestCourse && (
        <div className="relative bg-gradient-to-r from-green-50 to-green-100 p-2 rounded-lg border border-green-200 overflow-hidden">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="text-[10px] font-medium text-green-800">En Güçlü Dersin</h3>
              {scopeBadge}
            </div>
            <p className="text-xs font-bold text-green-900">{bestCourse.course}</p>
            <p className={`text-[10px] ${bestCourse.successRate >= 80 ? 'text-emerald-700' : bestCourse.successRate >= 60 ? 'text-amber-700' : 'text-rose-700'}`}>{bestCourse.successRate}% başarı</p>
          </div>
          <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-200 rounded-full flex items-center justify-center">
            <span className="text-green-800 font-bold text-xs">✓</span>
          </div>
        </div>
      )}
      {worstCourse && bestCourse?.course !== worstCourse?.course && (
        <div className="relative bg-gradient-to-r from-orange-50 to-orange-100 p-2 rounded-lg border border-orange-200 overflow-hidden">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="text-[10px] font-medium text-orange-800">Geliştirilmesi Gereken</h3>
              {scopeBadge}
            </div>
            <p className="text-xs font-bold text-orange-900">{worstCourse.course}</p>
            <p className={`text-[10px] ${worstCourse.successRate >= 80 ? 'text-emerald-700' : worstCourse.successRate >= 60 ? 'text-amber-700' : 'text-rose-700'}`}>{worstCourse.successRate}% başarı</p>
          </div>
          <div className="absolute bottom-2 right-2 w-6 h-6 bg-orange-200 rounded-full flex items-center justify-center">
            <span className="text-orange-800 font-bold text-xs">!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceCards;
