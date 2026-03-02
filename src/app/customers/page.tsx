'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Search } from 'lucide-react';

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
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    if (!search) return true;
    return c.name.toLowerCase().includes(search.toLowerCase());
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${String(d.getDate()).padStart(2, '0')}`;
  };

  const getGenderBadge = (gender: string) => {
    if (gender === 'male') {
      return <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-500 text-white text-xs font-bold">남</span>;
    }
    if (gender === 'female') {
      return <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-pink-500 text-white text-xs font-bold">여</span>;
    }
    return <span className="text-gray-400">-</span>;
  };

  const getCalendarType = (type: string) => {
    switch (type) {
      case 'solar': return '양력';
      case 'lunar': return '음력';
      case 'leap': return '윤달';
      default: return '양력';
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">고객 관리</h1>
          <p className="text-sm text-gray-500 mt-1">등록된 고객 정보를 관리합니다</p>
        </div>

        {/* Customer List Card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          {/* Card Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">고객 목록</h2>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="이름으로 검색..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" className="rounded border-gray-300" />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">이름</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">성별</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">생년월일</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">출생시간</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">음양력</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">연락처</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">이메일</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">등록일</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">로딩 중...</td>
                  </tr>
                ) : filteredCustomers.length > 0 ? (
                  filteredCustomers.slice(0, pageSize).map(customer => (
                    <tr key={customer.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <input type="checkbox" className="rounded border-gray-300" />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{customer.name}</td>
                      <td className="px-4 py-3">{getGenderBadge(customer.gender)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{customer.birth_date || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{customer.birth_time || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{getCalendarType(customer.calendar_type)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{customer.phone || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        {customer.email ? (
                          <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">{customer.email}</a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(customer.created_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">
                      {search ? '검색 결과가 없습니다.' : '등록된 고객이 없습니다.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">총 {filteredCustomers.length}개</span>
            <select
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
              className="px-2 py-1 border border-gray-200 rounded text-sm bg-white"
            >
              <option value={20}>20개씩</option>
              <option value={50}>50개씩</option>
              <option value={100}>100개씩</option>
            </select>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
