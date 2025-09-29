
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { TestResult } from '../types';
import ExpandIcon from './icons/ExpandIcon';
import InfoIcon from './icons/InfoIcon';

interface CourseSuccessChartProps {
  data: TestResult[];
  height?: number;
  onEnlarge?: () => void;
  showEnlarge?: boolean;
  scopeBadge?: React.ReactNode;
}

const CourseSuccessChart: React.FC<CourseSuccessChartProps> = ({ data, height = 60, onEnlarge, showEnlarge = true, scopeBadge }) => {
  const getCourseSuccessData = () => {
    const courseData: { [key: string]: { totalCorrect: number; totalWrong: number; totalEmpty: number; totalQuestions: number } } = {};

    data.forEach(result => {
      if (!courseData[result.dersAdi]) {
        courseData[result.dersAdi] = { totalCorrect: 0, totalWrong: 0, totalEmpty: 0, totalQuestions: 0 };
      }
      courseData[result.dersAdi].totalCorrect += result.dogruSayisi;
      courseData[result.dersAdi].totalWrong += result.yanlisSayisi;
      courseData[result.dersAdi].totalEmpty += result.bosSayisi;
      courseData[result.dersAdi].totalQuestions += result.dogruSayisi + result.yanlisSayisi + result.bosSayisi;
    });

    return Object.keys(courseData).map(course => {
      const { totalCorrect, totalWrong, totalQuestions } = courseData[course];
      const netCorrect = totalCorrect - totalWrong / 4;
      const successRate = totalQuestions > 0 ? Math.round((Math.max(0, netCorrect) / totalQuestions) * 100) : 0;
      return {
        name: course,
        'Başarı Oranı': successRate,
      };
    });
  };

  const chartData = getCourseSuccessData();

  return (
    <div className="bg-white p-1.5 rounded-lg border border-gray-200 shadow-sm h-full">
      <div className="flex items-center justify-between mb-1.5 gap-1">
        <div className="flex items-center gap-1">
          <h2 className="text-[10px] font-semibold text-gray-800">Derslere Göre Başarı Dağılımı</h2>
          <span
            title="Başarı oranı net doğru / toplam sorudan hesaplanır. Kapsam seçimine göre veri değişir."
            aria-label="Başarı oranı net doğru / toplam sorudan hesaplanır. Kapsam seçimine göre veri değişir."
            className="text-gray-400 hover:text-gray-600"
          >
            <InfoIcon className="h-2.5 w-2.5" />
          </span>
          {scopeBadge}
        </div>
        {showEnlarge && (
          <button
            type="button"
            aria-label="Büyüt"
            onClick={onEnlarge}
            className="inline-flex items-center justify-center h-5 w-5 rounded border border-gray-300 hover:bg-gray-50 text-gray-600"
          >
            <ExpandIcon className="h-3 w-3" />
          </button>
        )}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <CartesianGrid strokeDasharray="2 2" stroke="#f5f5f5" />
          <XAxis dataKey="name" fontSize={8} />
          <YAxis fontSize={8} />
          <Tooltip />
          <Bar dataKey="Başarı Oranı" barSize={10} radius={[1, 1, 0, 0]}>
            {chartData.map((entry, index) => {
              const v = entry['Başarı Oranı'] as number;
              const fill = v >= 80 ? '#10b981' : v >= 60 ? '#f59e0b' : '#f43f5e';
              return <Cell key={`cell-${index}`} fill={fill} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CourseSuccessChart;
