import React, { useState, useMemo } from 'react';
import { User } from '../types';
import ChartBarIcon from './icons/ChartBarIcon';
import CalendarIcon from './icons/CalendarIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import FilterIcon from './icons/FilterIcon';
import ExpandIcon from './icons/ExpandIcon';
import ChartModal from './ChartModal';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter } from 'recharts';

interface ExamsPageProps {
  user: User;
}

export default function ExamsPage({ user }: ExamsPageProps) {
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'improvement'>('date');
  const [timeFilter, setTimeFilter] = useState<'7d' | '30d' | '90d' | 'all'>('all');
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  // Mock exam data with more comprehensive information
  const exams = useMemo(() => [
    {
      id: '1',
      date: '2024-01-20',
      name: 'LGS Deneme 1',
      publisher: 'Karekök Yayınları',
      totalQuestions: 90,
      subjects: {
        'Türkçe': { correct: 16, wrong: 3, empty: 1, maxQuestions: 20, difficulty: 7.5 },
        'Matematik': { correct: 17, wrong: 2, empty: 1, maxQuestions: 20, difficulty: 8.2 },
        'Fen': { correct: 15, wrong: 4, empty: 1, maxQuestions: 20, difficulty: 7.8 },
        'Sosyal': { correct: 13, wrong: 5, empty: 2, maxQuestions: 20, difficulty: 6.9 },
        'İngilizce': { correct: 8, wrong: 2, empty: 0, maxQuestions: 10, difficulty: 7.1 }
      }
    },
    {
      id: '2',
      date: '2024-01-15',
      name: 'LGS Deneme 2',
      publisher: 'Karekök Yayınları',
      totalQuestions: 90,
      subjects: {
        'Türkçe': { correct: 14, wrong: 4, empty: 2, maxQuestions: 20, difficulty: 7.2 },
        'Matematik': { correct: 15, wrong: 3, empty: 2, maxQuestions: 20, difficulty: 7.9 },
        'Fen': { correct: 13, wrong: 5, empty: 2, maxQuestions: 20, difficulty: 7.5 },
        'Sosyal': { correct: 11, wrong: 6, empty: 3, maxQuestions: 20, difficulty: 6.7 },
        'İngilizce': { correct: 7, wrong: 2, empty: 1, maxQuestions: 10, difficulty: 6.8 }
      }
    },
    {
      id: '3',
      date: '2024-01-10',
      name: 'LGS Deneme 3',
      publisher: 'Bilfen Yayınları',
      totalQuestions: 90,
      subjects: {
        'Türkçe': { correct: 12, wrong: 5, empty: 3, maxQuestions: 20, difficulty: 6.8 },
        'Matematik': { correct: 13, wrong: 4, empty: 3, maxQuestions: 20, difficulty: 7.4 },
        'Fen': { correct: 11, wrong: 6, empty: 3, maxQuestions: 20, difficulty: 7.1 },
        'Sosyal': { correct: 9, wrong: 7, empty: 4, maxQuestions: 20, difficulty: 6.4 },
        'İngilizce': { correct: 6, wrong: 3, empty: 1, maxQuestions: 10, difficulty: 6.5 }
      }
    },
    {
      id: '4',
      date: '2024-01-05',
      name: 'LGS Deneme 4',
      publisher: 'Bilfen Yayınları',
      totalQuestions: 90,
      subjects: {
        'Türkçe': { correct: 10, wrong: 6, empty: 4, maxQuestions: 20, difficulty: 6.5 },
        'Matematik': { correct: 11, wrong: 5, empty: 4, maxQuestions: 20, difficulty: 7.0 },
        'Fen': { correct: 9, wrong: 7, empty: 4, maxQuestions: 20, difficulty: 6.8 },
        'Sosyal': { correct: 8, wrong: 8, empty: 4, maxQuestions: 20, difficulty: 6.2 },
        'İngilizce': { correct: 5, wrong: 3, empty: 2, maxQuestions: 10, difficulty: 6.3 }
      }
    }
  ], []);

  const stats = useMemo(() => {
    const totalExams = exams.length;
    const avgNet = exams.reduce((sum, exam) => {
      const totalNet = Object.values(exam.subjects).reduce((subSum, subject) => {
        return subSum + (subject.correct - subject.wrong / 3);
      }, 0);
      return sum + totalNet;
    }, 0) / totalExams;

    const bestNet = Math.max(...exams.map(exam => 
      Object.values(exam.subjects).reduce((sum, subject) => 
        sum + (subject.correct - subject.wrong / 3), 0
      )
    ));

    const improvement = exams.length > 1 ? 
      (Object.values(exams[0].subjects).reduce((sum, subject) => sum + (subject.correct - subject.wrong / 3), 0) -
       Object.values(exams[exams.length - 1].subjects).reduce((sum, subject) => sum + (subject.correct - subject.wrong / 3), 0)) : 0;

    const consistency = exams.length > 1 ? 
      100 - (Math.abs(improvement) / avgNet * 100) : 100;

    return {
      totalExams,
      avgNet: Math.round(avgNet * 100) / 100,
      bestNet: Math.round(bestNet * 100) / 100,
      improvement: Math.round(improvement * 100) / 100,
      consistency: Math.round(consistency)
    };
  }, [exams]);

  const filteredExams = useMemo(() => {
    let filtered = [...exams];
    
    if (timeFilter !== 'all') {
      const days = timeFilter === '7d' ? 7 : timeFilter === '30d' ? 30 : 90;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filtered = filtered.filter(exam => new Date(exam.date) >= cutoffDate);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortBy === 'score') {
        const aNet = Object.values(a.subjects).reduce((sum, s) => sum + (s.correct - s.wrong / 3), 0);
        const bNet = Object.values(b.subjects).reduce((sum, s) => sum + (s.correct - s.wrong / 3), 0);
        return bNet - aNet;
      } else {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

    return filtered;
  }, [exams, sortBy, timeFilter]);

  // Chart data preparations
  const trendData = useMemo(() => {
    return exams.map(exam => {
      const subjects = exam.subjects;
      return {
        date: new Date(exam.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }),
        'Türkçe': Math.round((subjects['Türkçe'].correct - subjects['Türkçe'].wrong / 3) * 100) / 100,
        'Matematik': Math.round((subjects['Matematik'].correct - subjects['Matematik'].wrong / 3) * 100) / 100,
        'Fen': Math.round((subjects['Fen'].correct - subjects['Fen'].wrong / 3) * 100) / 100,
        'Sosyal': Math.round((subjects['Sosyal'].correct - subjects['Sosyal'].wrong / 3) * 100) / 100,
        'İngilizce': Math.round((subjects['İngilizce'].correct - subjects['İngilizce'].wrong / 3) * 100) / 100,
        'Toplam': Math.round(Object.values(subjects).reduce((sum, s) => sum + (s.correct - s.wrong / 3), 0) * 100) / 100
      };
    }).reverse();
  }, [exams]);

  const subjectComparisonData = useMemo(() => {
    const subjects = ['Türkçe', 'Matematik', 'Fen', 'Sosyal', 'İngilizce'];
    return subjects.map(subject => {
      const avgNet = exams.reduce((sum, exam) => {
        const s = exam.subjects[subject];
        return sum + (s.correct - s.wrong / 3);
      }, 0) / exams.length;
      
      const avgSuccess = exams.reduce((sum, exam) => {
        const s = exam.subjects[subject];
        return sum + (s.correct / s.maxQuestions * 100);
      }, 0) / exams.length;

      return {
        subject,
        'Ortalama Net': Math.round(avgNet * 100) / 100,
        'Başarı %': Math.round(avgSuccess),
        'Zorluk': Math.round(exams.reduce((sum, exam) => sum + exam.subjects[subject].difficulty, 0) / exams.length * 10) / 10
      };
    });
  }, [exams]);

  const publisherData = useMemo(() => {
    const publishers = {};
    exams.forEach(exam => {
      if (!publishers[exam.publisher]) {
        publishers[exam.publisher] = { count: 0, totalNet: 0 };
      }
      publishers[exam.publisher].count++;
      publishers[exam.publisher].totalNet += Object.values(exam.subjects).reduce((sum, s) => sum + (s.correct - s.wrong / 3), 0);
    });

    return Object.keys(publishers).map(pub => ({
      publisher: pub,
      'Deneme Sayısı': publishers[pub].count,
      'Ortalama Net': Math.round(publishers[pub].totalNet / publishers[pub].count * 100) / 100
    }));
  }, [exams]);

  const radarData = useMemo(() => {
    if (exams.length === 0) return [];
    const latestExam = exams[0];
    return Object.keys(latestExam.subjects).map(subject => ({
      subject,
      net: Math.round((latestExam.subjects[subject].correct - latestExam.subjects[subject].wrong / 3) * 100) / 100,
      maxNet: latestExam.subjects[subject].maxQuestions
    }));
  }, [exams]);

  const difficultyAnalysisData = useMemo(() => {
    return exams.map(exam => {
      const avgDifficulty = Object.values(exam.subjects).reduce((sum, s) => sum + s.difficulty, 0) / Object.keys(exam.subjects).length;
      const totalNet = Object.values(exam.subjects).reduce((sum, s) => sum + (s.correct - s.wrong / 3), 0);
      return {
        zorluk: Math.round(avgDifficulty * 10) / 10,
        net: Math.round(totalNet * 100) / 100,
        date: exam.date
      };
    });
  }, [exams]);

  const calculateNet = (correct: number, wrong: number) => {
    return Math.max(0, correct - (wrong / 3));
  };

  const calculateSuccessRate = (correct: number, total: number) => {
    return Math.round((correct / total) * 100);
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];

  const renderChart = (chartType: string) => {
    switch (chartType) {
      case 'trend':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Türkçe" stroke="#8884d8" strokeWidth={2} />
              <Line type="monotone" dataKey="Matematik" stroke="#82ca9d" strokeWidth={2} />
              <Line type="monotone" dataKey="Fen" stroke="#ffc658" strokeWidth={2} />
              <Line type="monotone" dataKey="Sosyal" stroke="#ff7300" strokeWidth={2} />
              <Line type="monotone" dataKey="İngilizce" stroke="#00ff00" strokeWidth={2} />
              <Line type="monotone" dataKey="Toplam" stroke="#ff0000" strokeWidth={3} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'comparison':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={subjectComparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Ortalama Net" fill="#8884d8" />
              <Bar dataKey="Başarı %" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'publisher':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={publisherData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="publisher" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Deneme Sayısı" fill="#8884d8" />
              <Bar dataKey="Ortalama Net" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" fontSize={12} />
              <PolarRadiusAxis fontSize={10} />
              <Radar name="Net Puan" dataKey="net" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
            </RadarChart>
          </ResponsiveContainer>
        );
      
      case 'difficulty':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart data={difficultyAnalysisData}>
              <CartesianGrid />
              <XAxis dataKey="zorluk" name="Zorluk" fontSize={12} />
              <YAxis dataKey="net" name="Net" fontSize={12} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Zorluk vs Net" data={difficultyAnalysisData} fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <ChartBarIcon className="w-8 h-8" />
              </div>
              Deneme Sınavları Analizi
            </h1>
            <p className="text-blue-100 mt-2">Kapsamlı performans analizi ve gelişim takibi</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Toplam Deneme</p>
              <p className="text-2xl font-bold text-blue-900">{stats.totalExams}</p>
            </div>
            <BookOpenIcon className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Ortalama Net</p>
              <p className="text-2xl font-bold text-green-900">{stats.avgNet}</p>
            </div>
            <ChartBarIcon className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">En Yüksek Net</p>
              <p className="text-2xl font-bold text-purple-900">{stats.bestNet}</p>
            </div>
            <CalendarIcon className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">Gelişim</p>
              <p className={`text-2xl font-bold ${stats.improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.improvement >= 0 ? '+' : ''}{stats.improvement}
              </p>
            </div>
            <FilterIcon className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-700">Tutarlılık</p>
              <p className="text-2xl font-bold text-indigo-900">%{stats.consistency}</p>
            </div>
            <ChartBarIcon className="w-8 h-8 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Net Gelişim Trendi</h3>
            <button
              onClick={() => setSelectedChart('trend')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ExpandIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="h-64">
            {renderChart('trend')}
          </div>
        </div>

        {/* Subject Comparison */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Branş Karşılaştırma</h3>
            <button
              onClick={() => setSelectedChart('comparison')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ExpandIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="h-64">
            {renderChart('comparison')}
          </div>
        </div>

        {/* Publisher Analysis */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Yayın Analizi</h3>
            <button
              onClick={() => setSelectedChart('publisher')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ExpandIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="h-64">
            {renderChart('publisher')}
          </div>
        </div>

        {/* Radar Chart */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Son Deneme Analizi</h3>
            <button
              onClick={() => setSelectedChart('radar')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ExpandIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="h-64">
            {renderChart('radar')}
          </div>
        </div>

        {/* Difficulty Analysis */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Zorluk Analizi</h3>
            <button
              onClick={() => setSelectedChart('difficulty')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ExpandIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="h-64">
            {renderChart('difficulty')}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sıralama:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'score' | 'improvement')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date">Tarihe Göre</option>
              <option value="score">Net Puana Göre</option>
              <option value="improvement">Gelişime Göre</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Zaman:</label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as '7d' | '30d' | '90d' | 'all')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7d">Son 7 Gün</option>
              <option value="30d">Son 30 Gün</option>
              <option value="90d">Son 90 Gün</option>
              <option value="all">Tümü</option>
            </select>
          </div>

          <div className="text-sm text-gray-600 sm:ml-auto">
            {filteredExams.length} sonuç gösteriliyor
          </div>
        </div>
      </div>

      {/* Exam Results */}
      <div className="space-y-4">
        {filteredExams.length === 0 ? (
          <div className="bg-white p-12 rounded-xl shadow-lg border border-gray-200 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpenIcon className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Henüz deneme sınavı yok</h3>
            <p className="text-gray-600 mb-6">İlk deneme sınavınızı ekleyerek analiz sürecini başlatın</p>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
              Deneme Ekle
            </button>
          </div>
        ) : (
          filteredExams.map((exam) => (
            <div key={exam.id} className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(exam.date).toLocaleDateString('tr-TR', { 
                          day: '2-digit', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                    <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {exam.name}
                    </div>
                    <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                      {exam.publisher}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm text-gray-600 mb-2">
                      Toplam Net: <span className="font-semibold text-gray-900 text-lg">
                        {Object.values(exam.subjects).reduce((sum, s) => sum + calculateNet(s.correct, s.wrong), 0).toFixed(1)}
                      </span>
                      <span className="ml-4">
                        Başarı: <span className="font-semibold text-green-600">
                          %{Math.round(Object.values(exam.subjects).reduce((sum, s) => sum + (s.correct / s.maxQuestions * 100), 0) / Object.keys(exam.subjects).length)}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {Object.entries(exam.subjects).map(([subject, scores]) => {
                      const net = calculateNet(scores.correct, scores.wrong);
                      const successRate = calculateSuccessRate(scores.correct, scores.maxQuestions);
                      
                      return (
                        <div key={subject} className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200">
                          <div className="text-xs font-semibold text-gray-700 mb-2">{subject}</div>
                          <div className="text-lg font-bold text-gray-900 mb-1">{net.toFixed(1)}</div>
                          <div className="text-xs text-gray-600 mb-2">
                            {scores.correct}D {scores.wrong}Y {scores.empty}B
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                            <div 
                              className={`h-2 rounded-full ${successRate >= 80 ? 'bg-green-500' : successRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${successRate}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500">%{successRate}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Chart Modal */}
      <ChartModal
        isOpen={selectedChart !== null}
        onClose={() => setSelectedChart(null)}
      >
        {selectedChart && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              {selectedChart === 'trend' && 'Net Gelişim Trendi'}
              {selectedChart === 'comparison' && 'Branş Karşılaştırma'}
              {selectedChart === 'publisher' && 'Yayın Analizi'}
              {selectedChart === 'radar' && 'Son Deneme Analizi'}
              {selectedChart === 'difficulty' && 'Zorluk Analizi'}
            </h2>
            <div className="h-96">
              {renderChart(selectedChart)}
            </div>
          </div>
        )}
      </ChartModal>
    </div>
  );
}