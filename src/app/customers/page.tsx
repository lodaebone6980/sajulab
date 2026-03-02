'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

interface Customer {
  id: number;
  name: string;
  gender: string;
  birth_date: string;
  birth_time: string;
  calendar_type: string;
  phone: string;
  email: string;
  created_at: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState('');

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoading(true);
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        const response = await fetch(`/api/customers${query}`, {
          method: 'GET',
        });

        if (!response.ok) {
          setError('고객 정보를 불러올 수 없습니다.');
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        setCustomers(data.customers);
        setCurrentPage(1);
        setError('');
      } catch (err) {
        console.error('Fetch customers error:', err);
        setError('고객 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, [search]);

  // Pagination
  const totalPages = Math.ceil(customers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = customers.slice(startIndex, endIndex);

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Get gender badge
  const getGenderBadge = (gender: string) => {
    if (gender === 'male') {
      return <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded">남</span>;
    } else if (gender === 'female') {
      return <span className="px-3 py-1 bg-pink-100 text-pink-800 text-sm font-medium rounded">여</span>;
    }
    return <span className="text-sm">{gender}</span>;
  };

  // Get calendar type
  const getCalendarType = (type: string) => {
    if (type === 'solar') return '양력';
    if (type === 'lunar') return '음력';
    if (type === 'leap') return '윤달';
    return type;
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">고객 관리</h1>
          <p className="text-gray-600 mt-2">등록된 고객 정보를 관리합니다</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6 flex justify-end">
          <input
            type="text"
            placeholder="이름으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-pink-500"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input type="checkbox" className="rounded" />
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">이름</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">성별</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">생년월일</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">출생시간</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">음양력</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">연락처</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">이메일</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">등록일</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCustomers.length > 0 ? (
                    paginatedCustomers.map((customer) => (
                      <tr key={customer.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <input type="checkbox" className="rounded" />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{customer.name}</td>
                        <td className="px-6 py-4 text-sm">{getGenderBadge(customer.gender)}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{formatDate(customer.birth_date)}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{customer.birth_time || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{getCalendarType(customer.calendar_type)}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{customer.phone || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{customer.email || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{formatDate(customer.created_at)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                        {search ? '검색 결과가 없습니다.' : '등록된 고객이 없습니다.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer with pagination */}
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                총 <span className="font-semibold">{customers.length}</span>개
              </div>

              <div className="flex items-center gap-4">
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-pink-500"
                >
                  <option value={10}>10개씩</option>
                  <option value={20}>20개씩</option>
                  <option value={50}>50개씩</option>
                  <option value={100}>100개씩</option>
                </select>

                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    이전
                  </button>

                  <span className="px-3 py-2 text-sm">
                    {currentPage} / {totalPages || 1}
                  </span>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    다음
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
