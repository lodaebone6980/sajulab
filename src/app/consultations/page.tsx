'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { ChevronLeft, ChevronRight, Search, Plus, Star } from 'lucide-react';

interface ConsultationStats {
  total: number;
  inProgress: number;
  completed: number;
  noShow: number;
}

interface Consultation {
  id: number;
  date: string;
  chat_history: string;
  chat_link: string;
  status: string;
  gender: string;
  name: string;
  birth_date: string;
  calendar_type: string;
  birth_time: string;
  ganji: string;
  email: string;
  product: string;
  amount: number;
  question: string;
  additional_payment: string;
  note: string;
}

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [stats, setStats] = useState<ConsultationStats>({ total: 0, inProgress: 0, completed: 0, noShow: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchConsultations();
  }, [selectedDate, statusFilter]);

  const fetchConsultations = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.set('date', selectedDate);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/consultations?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setConsultations(data.consultations || []);
        setStats(data.stats || { total: 0, inProgress: 0, completed: 0, noShow: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch consultations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateDate = (direction: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + direction);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const formatDisplayDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}.`;
  };

  const columns = [
    '#', '날짜', '채팅내역', '채팅링크', '상태', '성별', '이름',
    '생년월일', '음양', '시간', '간지', '이메일', '상품', '금액',
    '질문', '추가입금', '비고'
  ];

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">상담 기록</h1>
            <p className="text-sm text-gray-500 mt-1">당근마켓 등 채팅 상담 기록을 관리합니다</p>
          </div>
          <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Plus size={16} />
            새 기록
          </button>
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          {/* Date Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateDate(-1)}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-400">📅</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
              />
            </div>
            <button
              onClick={() => navigateDate(1)}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
            >
              <ChevronRight size={18} />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 ml-1"
            >
              오늘
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <span className="text-gray-400">🔽</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="all">전체 상태</option>
              <option value="pending">대기</option>
              <option value="in_progress">진행중</option>
              <option value="completed">완료</option>
              <option value="no_show">미출</option>
            </select>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="이름, 이메일, 휴대폰 검색..."
              className="w-full pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 ml-auto text-sm">
            <span className="text-gray-600">총 <strong>{stats.total}</strong>건</span>
            <span className="text-blue-600">진행중 <strong>{stats.inProgress}</strong>건</span>
            <span className="text-green-600">완료 <strong>{stats.completed}</strong>건</span>
            <span className="text-red-600">미출 <strong>{stats.noShow}</strong>건</span>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          {/* Table Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">총 <strong>{stats.total}</strong>건</span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-400">전 선택되지않은 선택</span>
            </div>
            <button className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              <Star size={12} />
              새 별 추가
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-3 py-3 w-10">
                    <input type="checkbox" className="rounded border-gray-300" />
                  </th>
                  {columns.map(col => (
                    <th key={col} className="text-left px-3 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-4 py-16 text-center text-gray-400 text-sm">
                      로딩 중...
                    </td>
                  </tr>
                ) : consultations.length > 0 ? (
                  consultations.map((item, idx) => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-3 py-3">
                        <input type="checkbox" className="rounded border-gray-300" />
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-400">{idx + 1}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">{item.date}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">{item.chat_history || '-'}</td>
                      <td className="px-3 py-3 text-sm">
                        {item.chat_link ? (
                          <a href={item.chat_link} target="_blank" className="text-blue-600 hover:underline">링크</a>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">{item.status}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">{item.gender}</td>
                      <td className="px-3 py-3 text-sm text-gray-900 font-medium">{item.name}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">{item.birth_date}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">{item.calendar_type}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">{item.birth_time}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">{item.ganji}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">{item.email}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">{item.product}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">{item.amount}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">{item.question}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">{item.additional_payment}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">{item.note}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-4 py-20 text-center">
                      <p className="text-gray-500 font-medium">등록된 상담 기록이 없습니다</p>
                      <p className="text-gray-400 text-sm mt-1">상단의 '새 기록' 버튼을 클릭하세요</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
