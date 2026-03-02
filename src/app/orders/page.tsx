'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { FileText, X, Search, Filter, Download, Plus } from 'lucide-react';

interface Order {
  id: number;
  customer_name: string;
  product_name: string;
  product_code: string;
  status: string;
  birth_date: string;
  calendar_type: string;
  created_at: string;
  phone?: string;
  email?: string;
}

interface Product {
  id: number;
  name: string;
  code: string;
  price_points: number;
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [period, setPeriod] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState('male');
  const [formBirthDate, setFormBirthDate] = useState('');
  const [formBirthTime, setFormBirthTime] = useState('');
  const [formCalendarType, setFormCalendarType] = useState('solar');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMemo, setFormMemo] = useState('');
  const [formProductId, setFormProductId] = useState('');
  const [formInternalMemo, setFormInternalMemo] = useState('');

  const periods = [
    { value: 'today', label: '오늘' },
    { value: 'yesterday', label: '어제' },
    { value: '3days', label: '최근 3일' },
    { value: '7days', label: '최근 7일' },
    { value: '30days', label: '최근 30일' },
    { value: 'all', label: '전체' },
  ];

  const statusTabs = [
    { value: 'all', label: '전체' },
    { value: 'pending', label: '대기' },
    { value: 'requested', label: '요청됨' },
    { value: 'extracting', label: '추출중' },
    { value: 'analyzing', label: '분석중' },
    { value: 'pdf_generating', label: 'PDF생성중' },
    { value: 'processing', label: '처리중' },
    { value: 'completed', label: '완료' },
    { value: 'failed', label: '실패' },
  ];

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (period !== 'all') params.set('period', period);
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (productFilter) params.set('product', productFilter);

      const response = await fetch(`/api/orders?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [period, fromDate, toDate, search, statusFilter, productFilter]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const resetFilters = () => {
    setPeriod('all');
    setFromDate('');
    setToDate('');
    setSearch('');
    setStatusFilter('all');
    setProductFilter('');
  };

  const getStatusCount = (status: string) => {
    if (status === 'all') return orders.length;
    return orders.filter(o => o.status === status).length;
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
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}.`;
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formBirthDate || !formProductId) {
      setModalError('이름, 생년월일, 상품은 필수 입력입니다.');
      return;
    }

    setIsSubmitting(true);
    setModalError('');

    try {
      const selectedProduct = products.find(p => p.id === parseInt(formProductId));
      if (!selectedProduct) throw new Error('상품을 선택해주세요.');

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formName,
          birthDate: formBirthDate,
          birthTime: formBirthTime,
          gender: formGender,
          calendarType: formCalendarType,
          productCode: selectedProduct.code,
          phone: formPhone,
          email: formEmail,
          memo: formMemo,
          internalMemo: formInternalMemo,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '주문 등록에 실패했습니다.');
      }

      // Reset form
      setFormName('');
      setFormGender('male');
      setFormBirthDate('');
      setFormBirthTime('');
      setFormCalendarType('solar');
      setFormPhone('');
      setFormEmail('');
      setFormMemo('');
      setFormProductId('');
      setFormInternalMemo('');
      setShowModal(false);
      fetchOrders();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">주문 관리</h1>
            <p className="text-sm text-gray-500 mt-1">분석 요청을 관리합니다</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            개별 등록
          </button>
        </div>

        {/* Period Filters */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-600">기간:</span>
          {periods.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                period === p.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-gray-400 text-sm">📅</span>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
          />
          <span className="text-gray-400">~</span>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
          />
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <X size={14} />
            필터 초기화
          </button>
        </div>

        {/* Search + Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="이름, 이메일, 휴대폰, 내부비고 검색..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={productFilter}
              onChange={e => setProductFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="">모든 상품</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="all">전체</option>
              {statusTabs.slice(1).map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {statusTabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                statusFilter === tab.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label} ({getStatusCount(tab.value)})
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900">작업 목록</h2>
              <span className="text-sm text-gray-400">총 {total}건</span>
              {total > 0 && (
                <span className="text-xs text-gray-400">| 선택되지않은 3건</span>
              )}
            </div>
            {total > 0 && (
              <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg">
                <Download size={14} />
                엑셀로 {total}건
              </button>
            )}
          </div>

          {orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">#</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">고객명</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">상품</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">상태</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">생년월일</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">음양</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">생성일</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, idx) => (
                    <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <input type="checkbox" className="rounded border-gray-300" />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{order.customer_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{order.product_code || order.product_name}</td>
                      <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{order.birth_date || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {order.calendar_type === 'lunar' ? '음력' : order.calendar_type === 'leap' ? '윤달' : '양력'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(order.created_at)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => router.push(`/orders/${order.id}`)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          보기
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-20 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <FileText size={28} className="text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">작업이 없습니다.</p>
              <p className="text-gray-400 text-sm mt-1">엑셀 파일을 업로드하여 분석을 시작해보세요.</p>
            </div>
          )}
        </div>

        {/* 개별 등록 Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">개별 등록</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmitOrder} className="p-6 space-y-4">
                {modalError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                    {modalError}
                  </div>
                )}

                {/* 고객 정보 */}
                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-3">고객 정보</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">이름 *</label>
                      <input
                        type="text"
                        value={formName}
                        onChange={e => setFormName(e.target.value)}
                        placeholder="고객 이름"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">성별</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="modal-gender" value="male" checked={formGender === 'male'} onChange={e => setFormGender(e.target.value)} className="w-4 h-4 text-blue-600" />
                          <span className="text-sm">남</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="modal-gender" value="female" checked={formGender === 'female'} onChange={e => setFormGender(e.target.value)} className="w-4 h-4 text-blue-600" />
                          <span className="text-sm">여</span>
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">생년월일 *</label>
                        <input
                          type="date"
                          value={formBirthDate}
                          onChange={e => setFormBirthDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">출생시간</label>
                        <input
                          type="time"
                          value={formBirthTime}
                          onChange={e => setFormBirthTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">음양력</label>
                      <select
                        value={formCalendarType}
                        onChange={e => setFormCalendarType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="solar">양력</option>
                        <option value="lunar">음력</option>
                        <option value="leap">윤달</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">연락처</label>
                        <input
                          type="tel"
                          value={formPhone}
                          onChange={e => setFormPhone(e.target.value)}
                          placeholder="010-0000-0000"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">이메일</label>
                        <input
                          type="email"
                          value={formEmail}
                          onChange={e => setFormEmail(e.target.value)}
                          placeholder="example@email.com"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">메모</label>
                      <textarea
                        value={formMemo}
                        onChange={e => setFormMemo(e.target.value)}
                        placeholder="고객 관련 메모"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 주문 정보 */}
                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-3">주문 정보</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">상품 *</label>
                      <select
                        value={formProductId}
                        onChange={e => setFormProductId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">상품을 선택하세요</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id.toString()}>
                            {product.name} ({product.price_points?.toLocaleString() || 0} P)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">내부 메모</label>
                      <textarea
                        value={formInternalMemo}
                        onChange={e => setFormInternalMemo(e.target.value)}
                        placeholder="내부 관리용 메모"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
                  >
                    {isSubmitting ? '등록 중...' : '주문 등록'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-lg transition-colors text-sm"
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
