'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

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
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats');
        if (!response.ok) {
          throw new Error('데이터를 불러올 수 없습니다.');
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
        setError('대시보드 데이터를 불러올 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !stats) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="text-center text-red-600">{error || '데이터를 불러올 수 없습니다.'}</div>
        </div>
      </DashboardLayout>
    );
  }

  const getStatusColor = (statusKey: string) => {
    switch (statusKey) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
      case 'extracting':
      case 'analyzing':
      case 'pdf_generating':
        return 'bg-yellow-100 text-yellow-800';
      case 'requested':
        return 'bg-pink-100 text-pink-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBarColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-300';
      case 'requested':
        return 'bg-pink-300';
      case 'processing':
        return 'bg-yellow-300';
      case 'completed':
        return 'bg-green-400';
      case 'failed':
        return 'bg-red-400';
      default:
        return 'bg-gray-300';
    }
  };

  const totalStatusCount =
    stats.statusCounts.pending +
    stats.statusCounts.requested +
    stats.statusCounts.processing +
    stats.statusCounts.completed +
    stats.statusCounts.failed;

  return (
    <DashboardLayout>
      <div className="p-8 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
          <p className="text-gray-600 mt-2">운영감잡이님, 환영합니다!</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Points Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">포인트 잔액</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">
                  {stats.points.toLocaleString()}
                </p>
                <p className="text-gray-500 text-xs mt-2">P</p>
              </div>
              <div className="text-4xl text-yellow-500">💰</div>
            </div>
          </div>

          {/* Today Completed Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">오늘 완료</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {stats.todayCompleted}
                </p>
                <p className="text-gray-500 text-xs mt-2">건</p>
              </div>
              <div className="text-4xl">✓</div>
            </div>
          </div>

          {/* Processing Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">처리중</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">
                  {stats.processing}
                </p>
                <p className="text-gray-500 text-xs mt-2">건</p>
              </div>
              <div className="text-4xl">⏱️</div>
            </div>
          </div>

          {/* Total Orders Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">전체 작업</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {stats.totalOrders}
                </p>
                <p className="text-gray-500 text-xs mt-2">건</p>
              </div>
              <div className="text-4xl">📋</div>
            </div>
          </div>
        </div>

        {/* Status Progress Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">작업 현황</h2>

          <div className="space-y-4">
            {/* Pending */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">대기</span>
                <span className="text-sm text-gray-600">
                  {stats.statusCounts.pending}건
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gray-400 h-2 rounded-full"
                  style={{
                    width:
                      totalStatusCount > 0
                        ? `${(stats.statusCounts.pending / totalStatusCount) * 100}%`
                        : '0%',
                  }}
                ></div>
              </div>
            </div>

            {/* Requested */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">나가중</span>
                <span className="text-sm text-gray-600">
                  {stats.statusCounts.requested}건
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-pink-400 h-2 rounded-full"
                  style={{
                    width:
                      totalStatusCount > 0
                        ? `${(stats.statusCounts.requested / totalStatusCount) * 100}%`
                        : '0%',
                  }}
                ></div>
              </div>
            </div>

            {/* Processing */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">처리중</span>
                <span className="text-sm text-gray-600">
                  {stats.statusCounts.processing}건
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-400 h-2 rounded-full"
                  style={{
                    width:
                      totalStatusCount > 0
                        ? `${(stats.statusCounts.processing / totalStatusCount) * 100}%`
                        : '0%',
                  }}
                ></div>
              </div>
            </div>

            {/* Completed */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">완료</span>
                <span className="text-sm text-gray-600">
                  {stats.statusCounts.completed}건
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width:
                      totalStatusCount > 0
                        ? `${(stats.statusCounts.completed / totalStatusCount) * 100}%`
                        : '0%',
                  }}
                ></div>
              </div>
            </div>

            {/* Failed */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">실패</span>
                <span className="text-sm text-gray-600">
                  {stats.statusCounts.failed}건
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{
                    width:
                      totalStatusCount > 0
                        ? `${(stats.statusCounts.failed / totalStatusCount) * 100}%`
                        : '0%',
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Orders Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">최근 작업</h2>
          </div>

          {stats.recentOrders && stats.recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      고객명
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      상품
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      생성일
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {order.customerName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {order.product}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            order.statusKey
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {order.createdAt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-gray-500">
              작업 내역이 없습니다.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
