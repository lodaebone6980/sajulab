'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Search, Plus } from 'lucide-react';

interface Analysis {
  product_id: number;
  product_code: string;
  product_name: string;
  order_count: number;
}

interface UnanalyzedProduct {
  id: number;
  code: string;
  name: string;
}

interface Customer {
  id: number;
  name: string;
  gender: string;
  birth_date: string;
  birth_time: string;
  calendar_type: string;
  phone: string;
  email: string;
  memo: string;
  customer_code: string;
  nickname: string;
  created_at: string;
  analyses: Analysis[];
  unanalyzed_products: UnanalyzedProduct[];
}

const productColorMap: Record<string, string> = {
  'saju-data': 'bg-gray-500',
  'saju-basic': 'bg-blue-500',
  'saju-premium': 'bg-purple-500',
  'saju-newyear': 'bg-amber-500',
  'saju-love': 'bg-red-500',
};

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [isCreatingOrder, setIsCreatingOrder] = useState<number | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers?withAnalyses=true');
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
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) ||
      c.nickname?.toLowerCase().includes(q) ||
      c.customer_code?.toLowerCase().includes(q);
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${String(d.getDate()).padStart(2, '0')}`;
  };

  const getGenderBadge = (gender: string) => {
    if (gender === 'male') {
      return <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">남</span>;
    }
    if (gender === 'female') {
      return <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 text-xs font-bold">여</span>;
    }
    return <span className="text-gray-400">-</span>;
  };

  const getCalendarType = (type: string) => {
    switch (type) {
      case 'lunar': return '음력';
      case 'leap': return '윤달';
      default: return '양력';
    }
  };

  const handleCreateAnalysis = async (customer: Customer, productCode: string) => {
    if (isCreatingOrder) return;
    setIsCreatingOrder(customer.id);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          customerName: customer.name,
          birthDate: customer.birth_date,
          birthTime: customer.birth_time || '',
          gender: customer.gender,
          calendarType: customer.calendar_type,
          productCode,
        }),
      });
      if (res.ok) {
        fetchCustomers(); // refresh
      }
    } catch (err) {
      console.error('Failed to create analysis:', err);
    } finally {
      setIsCreatingOrder(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">고객 관리</h1>
          <p className="text-sm text-gray-500 mt-1">등록된 고객 정보와 분석 현황을 관리합니다</p>
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
                placeholder="이름, 닉네임, 코드 검색..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">고객코드</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">이름</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">닉네임</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">성별</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">생년월일</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">음양</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">분석항목</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">분석 추가</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">로딩 중...</td>
                  </tr>
                ) : filteredCustomers.length > 0 ? (
                  filteredCustomers.slice(0, pageSize).map(customer => (
                    <tr key={customer.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                          {customer.customer_code || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{customer.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{customer.nickname || '-'}</td>
                      <td className="px-4 py-3">{getGenderBadge(customer.gender)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{customer.birth_date || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{getCalendarType(customer.calendar_type)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {customer.analyses && customer.analyses.length > 0 ? (
                            customer.analyses.map((a: Analysis) => (
                              <span
                                key={a.product_code}
                                className={`px-2 py-0.5 text-xs text-white rounded ${productColorMap[a.product_code] || 'bg-gray-400'}`}
                              >
                                {a.product_name}{a.order_count > 1 ? ` (${a.order_count})` : ''}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-300">없음</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {customer.unanalyzed_products && customer.unanalyzed_products.length > 0 ? (
                          <select
                            onChange={e => {
                              if (e.target.value) {
                                handleCreateAnalysis(customer, e.target.value);
                                e.target.value = '';
                              }
                            }}
                            disabled={isCreatingOrder === customer.id}
                            className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                          >
                            <option value="">+ 분석 추가</option>
                            {customer.unanalyzed_products.map((p: UnanalyzedProduct) => (
                              <option key={p.id} value={p.code}>{p.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-green-500 font-medium">전체 완료</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                      {search ? '검색 결과가 없습니다.' : '등록된 고객이 없습니다.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">총 {filteredCustomers.length}명</span>
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
