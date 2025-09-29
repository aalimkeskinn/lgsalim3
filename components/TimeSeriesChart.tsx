
import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TestResult } from '../types';
import ExpandIcon from './icons/ExpandIcon';
import InfoIcon from './icons/InfoIcon';

interface TimeSeriesChartProps {
  data: TestResult[];
  height?: number;
  selectedCourse?: string;
  showFilter?: boolean;
  onEnlarge?: () => void;
  showEnlarge?: boolean;
  scopeBadge?: React.ReactNode;
}

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ data, height = 60, selectedCourse, showFilter = false, onEnlarge, showEnlarge = true, scopeBadge }) => {
  const courseOptions = useMemo(() => {
    const courses = Array.from(new Set(data.map(d => d.dersAdi))).sort();
    return ['all', ...courses];
  }, [data]);

  const [localCourse, setLocalCourse] = useState<string>('all');
  const [range, setRange] = useState<'7' | '30' | 'all'>('30');
  const effectiveCourse = showFilter ? localCourse : selectedCourse;

  const getTimeSeriesData = () => {
    const dateData: { [key: string]: { totalCorrect: number; totalWrong: number; totalQuestions: number; count: number } } = {};

    let filtered = effectiveCourse && effectiveCourse !== 'all'
      ? data.filter(r => r.dersAdi === effectiveCourse)
      : data;

    // time range filter
    if (range !== 'all') {
      const days = range === '7' ? 7 : 30;
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      start.setDate(start.getDate() - (days - 1));
      filtered = filtered.filter(r => {
        if (!r.createdAt) return false;
        const dt = new Date(r.createdAt.toDate());
        const d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
        return d >= start;
      });
    }

    filtered.forEach(result => {
      if (result.createdAt) {
        const dt = new Date(result.createdAt.toDate());
        const key = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate())).toISOString().slice(0, 10); // YYYY-MM-DD
        if (!dateData[key]) {
          dateData[key] = { totalCorrect: 0, totalWrong: 0, totalQuestions: 0, count: 0 };
        }
        dateData[key].totalCorrect += result.dogruSayisi;
        dateData[key].totalWrong += result.yanlisSayisi;
        dateData[key].totalQuestions += result.dogruSayisi + result.yanlisSayisi + result.bosSayisi;
        dateData[key].count += 1;
      }
    });

    return Object.keys(dateData).map(key => {
      const { totalCorrect, totalWrong, totalQuestions } = dateData[key];
      const netCorrect = totalCorrect - totalWrong / 4;
      const successRate = totalQuestions > 0 ? Math.round((Math.max(0, netCorrect) / totalQuestions) * 100) : 0;
      return {
        name: key, // ISO YYYY-MM-DD
        'Başarı Oranı': successRate,
      };
    });
  };

  const chartData = getTimeSeriesData();
  const avgSuccess = chartData.length
    ? Math.round(
        chartData.reduce((sum, d) => sum + (typeof d['Başarı Oranı'] === 'number' ? (d['Başarı Oranı'] as number) : 0), 0) / chartData.length
      )
    : 0;
  const lineColor = avgSuccess >= 80 ? '#10b981' : avgSuccess >= 60 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="bg-white p-1.5 rounded-lg border border-gray-200 shadow-sm h-full">
      <div className="flex items-center justify-between mb-1.5 gap-1">
        <div className="flex items-center gap-1">
          <h2 className="text-[10px] font-semibold text-gray-800">Zaman İçindeki Gelişim</h2>
          <span
            title="Zaman içinde başarı yüzdesi; ders ve kapsam seçimine göre filtrelenir."
            aria-label="Zaman içinde başarı yüzdesi; ders ve kapsam seçimine göre filtrelenir."
            className="text-gray-400 hover:text-gray-600"
          >
            <InfoIcon className="h-2.5 w-2.5" />
          </span>
          {scopeBadge}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {showFilter && courseOptions.length > 1 && (
            <div className="flex items-center gap-1 shrink-0">
            <label htmlFor="ts-course" className="text-[9px] text-gray-600">Ders:</label>
            <select
              id="ts-course"
              value={localCourse}
              onChange={(e) => setLocalCourse(e.target.value)}
              className="rounded border-gray-300 shadow-sm bg-white focus:ring-1 focus:ring-green-500 focus:border-green-500 py-0.5 px-1 text-[9px]"
            >
              {courseOptions.map(c => (
                <option key={c} value={c}>{c === 'all' ? 'Tüm Dersler' : c}</option>
              ))}
            </select>
            </div>
          )}
          <div className="hidden sm:block h-4 w-px bg-gray-200" />
          <div className="inline-flex items-center rounded bg-white border border-gray-200 p-0.5 shrink-0">
            <button
              type="button"
              className={`px-1.5 py-0.5 text-[9px] rounded ${range === '7' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' : 'text-gray-700'}`}
              onClick={() => setRange('7')}
            >
              <span className="sm:hidden">7g</span>
              <span className="hidden sm:inline">7g</span>
            </button>
            <button
              type="button"
              className={`px-1.5 py-0.5 text-[9px] rounded ${range === '30' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' : 'text-gray-700'}`}
              onClick={() => setRange('30')}
            >
              <span className="sm:hidden">30g</span>
              <span className="hidden sm:inline">30g</span>
            </button>
            <button
              type="button"
              className={`px-1.5 py-0.5 text-[9px] rounded ${range === 'all' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' : 'text-gray-700'}`}
              onClick={() => setRange('all')}
            >
              Tümü
            </button>
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
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <CartesianGrid strokeDasharray="2 2" stroke="#f5f5f5" />
          <XAxis
            dataKey="name"
            fontSize={8}
            tickFormatter={(v: string) => {
              const d = new Date(v);
              return isNaN(d.getTime()) ? v : d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
            }}
            angle={-30}
            tickMargin={4}
            interval="preserveStartEnd"
            tickCount={4}
          />
          <YAxis
            fontSize={8}
            domain={[0, 100]}
            allowDecimals={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            formatter={(value: number, name: string) => [`${value}%`, name]}
            labelFormatter={(label: string) => {
              const d = new Date(label);
              return isNaN(d.getTime()) ? label : d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
            }}
          />
          <Line type="monotone" dataKey="Başarı Oranı" stroke={lineColor} strokeWidth={1.5} activeDot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TimeSeriesChart;
