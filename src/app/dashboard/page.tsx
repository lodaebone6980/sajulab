'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Bell, Coins, TrendingUp, Clock, ClipboardList } from 'lucide-react';

interface DashboardStats {
  points: number;
  todayCompleted: number;
  processing: number;
  totalOrders: number;
  statusCounts: {
    pending: number;
    requested: number;
    processing: number;
    completed: number;
    failed: number;
  };
  recentOrders: Array<{
    id: number;
    customerName: string;
    product: string;
    status: string;
    statusKey: string;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-600',
      requested: 'bg-blue-100 text-blue-600',
      extracting: 'bg-yellow-100 text-yellow-700',
      analyzing: 'bg-orange-100 text-orange-600',
      pdf_generating: 'bg-purple-100 text-purple-600',
      processing: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-600',
      failed: 'bg-red-100 text-red-600',
    };
    const labels: Record<string, string> = {
      pending: '대기',
      requested: '요청됨',
      extracting: '추출중',
      analyzing: '분석중',
      pdf_generating: 'PDF생성중',
      processing: '처리중',
      completed: '완료',
      failed: '실패',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* 공지사항 Banner */}
        <div className="bg-gradient-to-r from-pink-400 via-pink-500 to-fuchsia-500 px-8 py-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={18} />
            <span className="font-bold text-sm">공지사항</span>
            <span className="bg-white/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">3건</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="shrink-0 mt-0.5 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">중요</span>
              <div>
                <p className="text-sm font-medium">가라반 수강생 필수 링크 모음 오픈!</p>
                <p className="text-xs text-white/70 mt-0.5">수강생 여러분을 위한 필수 도구와 링크들을 정리해두었습니다. 왼쪽 메뉴의 "링크 모음"에서 확인하세요!</p>
                <p className="text-[10px] text-white/50 mt-1">2025. 12. 20.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 mt-1 text-white/60">💡</span>
              <div>
                <p className="text-sm font-medium">PDF디자인 설정이 업데이트 되었습니다.</p>
                <p className="text-xs text-white/70 mt-0.5">다양한 버전으로 PDF설정을 하실 수 있도록 수정하였습니다.</p>
                <p className="text-[10px] text-white/50 mt-1">2025. 12. 25.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
            <p className="text-gray-500 text-sm mt-1">
              {stats ? '환영합니다!' : '로딩 중...'}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">포인트 잔액</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats ? `${stats.points.toLocaleString()}P` : '-'}
                  </p>
                </div>
                <div className="w-10 h-10 bg-yellow-50 rounded-full flex items-center justify-center">
                  <Coins size={20} className="text-yellow-500" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">오늘 완료</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats ? `${stats.todayCompleted}건` : '-'}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                  <TrendingUp size={20} className="text-green-500" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">처리중</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats ? `${stats.processing}건` : '-'}
                  </p>
                </div>
                <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
                  <Clock size={20} className="text-orange-500" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">전체 작업</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats ? `${stats.totalOrders}건` : '-'}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                  <ClipboardList size={20} className="text-blue-500" />
                </div>
              </div>
            </div>
          </div>

          {/* 작업 현황 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">작업 현황</h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-5 gap-0 rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-4 text-center border-r border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">대기</p>
                  <p className="text-xl font-bold text-gray-900">{stats?.statusCounts?.pending || 0}</p>
                </div>
                <div className="bg-blue-50 p-4 text-center border-r border-blue-100">
                  <p className="text-xs text-blue-500 mb-1">대기중</p>
                  <p className="text-xl font-bold text-blue-600">{stats?.statusCounts?.requested || 0}</p>
                </div>
                <div className="bg-yellow-50 p-4 text-center border-r border-yellow-100">
                  <p className="text-xs text-yellow-600 mb-1">처리중</p>
                  <p className="text-xl font-bold text-yellow-600">{stats?.statusCounts?.processing || 0}</p>
                </div>
                <div className="bg-green-50 p-4 text-center border-r border-green-100">
                  <p className="text-xs text-green-500 mb-1">완료</p>
                  <p className="text-xl font-bold text-green-600">{stats?.statusCounts?.completed || 0}</p>
                </div>
                <div className="bg-red-50 p-4 text-center">
                  <p className="text-xs text-red-500 mb-1">실패</p>
                  <p className="text-xl font-bold text-red-600">{stats?.statusCounts?.failed || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 최근 작업 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">최근 작업</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">고객명</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">상품</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">상태</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">생성일</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.recentOrders?.length ? (
                    stats.recentOrders.map((order) => (
                      <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-sm text-gray-900">{order.customerName}</td>
                        <td className="px-5 py-3 text-sm text-gray-600">{order.product}</td>
                        <td className="px-5 py-3">{getStatusBadge(order.statusKey)}</td>
                        <td className="px-5 py-3 text-sm text-gray-500">{order.createdAt}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center text-gray-400 text-sm">
                        {isLoading ? '로딩 중...' : '최근 작업이 없습니다.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
