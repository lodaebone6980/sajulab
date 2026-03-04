'use client';

import React, { useEffect, useState, useCallback, Fragment } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { FileText, X, Search, Filter, Download, Plus, Eye, Database, MessageSquare, Edit3, RefreshCw, ChevronDown, ChevronUp, Play, CheckSquare } from 'lucide-react';

interface Order {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_gender: string;
  customer_birth_date: string;
  customer_birth_time: string;
  customer_calendar_type: string;
  product_name: string;
  product_code: string;
  product_id: number;
  status: string;
  result_json: string;
  pdf_url: string;
  extra_answer: string;
  internal_memo: string;
  points_used: number;
  created_at: string;
  updated_at: string;
  completed_at: string;
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

  // 개별등록 Modal
  const [showRegModal, setShowRegModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regError, setRegError] = useState('');

  // 개별등록 Form
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState('male');
  const [formBirthDate, setFormBirthDate] = useState('');
  const [formBirthTime, setFormBirthTime] = useState('');
  const [formBirthTimeGanji, setFormBirthTimeGanji] = useState('');
  const [formCalendarType, setFormCalendarType] = useState('solar');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMemo, setFormMemo] = useState('');
  const [formProductId, setFormProductId] = useState('');
  const [formExtraAnswer, setFormExtraAnswer] = useState('');
  const [formInternalMemo, setFormInternalMemo] = useState('');

  // 정보수정 Modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [editName, setEditName] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editBirthTime, setEditBirthTime] = useState('');
  const [editCalendar, setEditCalendar] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // 데이터 Modal
  const [showDataModal, setShowDataModal] = useState(false);
  const [dataOrder, setDataOrder] = useState<Order | null>(null);
  const [dataTab, setDataTab] = useState<'summary' | 'full'>('summary');

  // 추가답변 Inline
  const [expandedAnswerId, setExpandedAnswerId] = useState<number | null>(null);
  const [extraAnswerText, setExtraAnswerText] = useState('');
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);

  // 재분석
  const [reanalyzingId, setReanalyzingId] = useState<number | null>(null);

  // 체크박스 선택
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

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
    { value: 'completed', label: '완료' },
    { value: 'failed', label: '실패' },
  ];

  const ganjiTimes = [
    { value: '', label: '-- 간지시간 선택 (선택) --' },
    { value: '2330', label: '자시 (23:30~01:29)' },
    { value: '0130', label: '축시 (01:30~03:29)' },
    { value: '0330', label: '인시 (03:30~05:29)' },
    { value: '0530', label: '묘시 (05:30~07:29)' },
    { value: '0730', label: '진시 (07:30~09:29)' },
    { value: '0930', label: '사시 (09:30~11:29)' },
    { value: '1130', label: '오시 (11:30~13:29)' },
    { value: '1330', label: '미시 (13:30~15:29)' },
    { value: '1530', label: '신시 (15:30~17:29)' },
    { value: '1730', label: '유시 (17:30~19:29)' },
    { value: '1930', label: '술시 (19:30~21:29)' },
    { value: '2130', label: '해시 (21:30~23:29)' },
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

  useEffect(() => { fetchProducts(); }, []);
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const resetFilters = () => {
    setPeriod('all');
    setFromDate('');
    setToDate('');
    setSearch('');
    setStatusFilter('all');
    setProductFilter('');
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
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  // 생년월일 포맷: "19901231" → "1990-12-31" or "1990.12.31"
  const formatBirthDate = (dateStr: string) => {
    if (!dateStr) return '-';
    if (dateStr.includes('-')) return dateStr;
    if (dateStr.length === 8) {
      return `${dateStr.slice(0, 4)}.${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`;
    }
    return dateStr;
  };

  // === 개별등록 ===
  const parseBirthDateInput = (input: string): string => {
    // "19901231" → "1990-12-31"
    const clean = input.replace(/[^0-9]/g, '');
    if (clean.length === 8) {
      return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
    }
    return input;
  };

  const parseBirthTimeInput = (input: string): string => {
    // "1430" → "14:30"
    const clean = input.replace(/[^0-9]/g, '');
    if (clean.length === 4) {
      return `${clean.slice(0, 2)}:${clean.slice(2, 4)}`;
    }
    if (clean.length === 2) {
      return `${clean}:00`;
    }
    return input;
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formBirthDate || !formProductId) {
      setRegError('이름, 생년월일, 상품은 필수 입력입니다.');
      return;
    }

    setIsSubmitting(true);
    setRegError('');

    try {
      const selectedProduct = products.find(p => p.id === parseInt(formProductId));
      if (!selectedProduct) throw new Error('상품을 선택해주세요.');

      const birthDateFormatted = parseBirthDateInput(formBirthDate);
      const birthTimeFormatted = formBirthTime ? parseBirthTimeInput(formBirthTime) : (formBirthTimeGanji ? parseBirthTimeInput(formBirthTimeGanji) : '');

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formName,
          birthDate: birthDateFormatted,
          birthTime: birthTimeFormatted,
          gender: formGender,
          calendarType: formCalendarType,
          productCode: selectedProduct.code,
          phone: formPhone,
          email: formEmail,
          memo: formMemo,
          extraAnswer: formExtraAnswer,
          internalMemo: formInternalMemo,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '주문 등록에 실패했습니다.');
      }

      // Reset
      setFormName(''); setFormGender('male'); setFormBirthDate(''); setFormBirthTime('');
      setFormBirthTimeGanji(''); setFormCalendarType('solar'); setFormPhone('');
      setFormEmail(''); setFormMemo(''); setFormProductId('');
      setFormExtraAnswer(''); setFormInternalMemo('');
      setShowRegModal(false);
      fetchOrders();
    } catch (err: any) {
      setRegError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // === 정보수정 ===
  const openDetailModal = (order: Order) => {
    setDetailOrder(order);
    setEditName(order.customer_name);
    setEditGender(order.customer_gender || 'male');
    setEditBirthDate(order.customer_birth_date || '');
    setEditBirthTime(order.customer_birth_time || '');
    setEditCalendar(order.customer_calendar_type || 'solar');
    setEditPhone((order as any).phone || '');
    setEditEmail((order as any).email || '');
    setIsEditingDetail(false);
    setShowDetailModal(true);
  };

  const handleSaveDetail = async () => {
    if (!detailOrder) return;
    try {
      const res = await fetch(`/api/orders/${detailOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_customer',
          customerName: editName,
          customerGender: editGender,
          customerBirthDate: editBirthDate,
          customerBirthTime: editBirthTime,
          customerCalendarType: editCalendar,
          customerPhone: editPhone,
          customerEmail: editEmail,
        }),
      });
      if (res.ok) {
        setIsEditingDetail(false);
        fetchOrders();
        setShowDetailModal(false);
      }
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  // === 재분석 ===
  const handleReanalyze = async (orderId: number) => {
    setReanalyzingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reanalyze' }),
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error('Reanalyze failed:', err);
    } finally {
      setReanalyzingId(null);
    }
  };

  // === 데이터 ===
  const openDataModal = (order: Order) => {
    setDataOrder(order);
    setDataTab('summary');
    setShowDataModal(true);
  };

  const getResultDataLines = (order: Order | null): string => {
    if (!order?.result_json) return '분석 데이터가 없습니다.';
    try {
      return JSON.stringify(JSON.parse(order.result_json), null, 2);
    } catch {
      return order.result_json;
    }
  };

  const getResultSummary = (order: Order | null): string => {
    if (!order?.result_json) return '분석 데이터가 없습니다.';
    try {
      const data = JSON.parse(order.result_json);
      // Show key parts only
      const summary = {
        fourPillars: data.fourPillars,
        elementProfile: data.elementProfile,
        yongshin: data.yongshin,
        strength: data.strength,
      };
      return JSON.stringify(summary, null, 2);
    } catch {
      return '요약 데이터를 불러올 수 없습니다.';
    }
  };

  const downloadResultData = (order: Order) => {
    if (!order.result_json) return;
    const blob = new Blob([getResultDataLines(order)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saju_data_${order.customer_name}_${order.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // === 추가답변 ===
  const toggleExtraAnswer = (order: Order) => {
    if (expandedAnswerId === order.id) {
      setExpandedAnswerId(null);
    } else {
      setExpandedAnswerId(order.id);
      setExtraAnswerText(order.extra_answer || '');
    }
  };

  // === 체크박스 ===
  const toggleSelectOrder = (orderId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map(o => o.id)));
    }
  };

  // 선택된 대기/실패 주문 필터
  const selectedPendingOrders = orders.filter(
    o => selectedIds.has(o.id) && (o.status === 'pending' || o.status === 'failed')
  );

  // === 일괄 실행 ===
  const handleBatchProcess = async () => {
    if (selectedPendingOrders.length === 0) return;
    setIsBatchProcessing(true);
    try {
      const res = await fetch('/api/orders/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: selectedPendingOrders.map(o => o.id) }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        // 1초 후 새로고침 (상태 반영)
        setTimeout(() => fetchOrders(), 1000);
        // 5초마다 자동 새로고침 (완료 감지)
        const interval = setInterval(() => {
          fetchOrders().then(() => {
            // 모든 주문이 완료/실패이면 새로고침 중단
          });
        }, 5000);
        setTimeout(() => clearInterval(interval), 120000); // 최대 2분
      }
    } catch (err) {
      console.error('Batch process failed:', err);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const saveExtraAnswer = async (orderId: number) => {
    setIsSavingAnswer(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_extra_answer', extraAnswer: extraAnswerText }),
      });
      if (res.ok) {
        fetchOrders();
        setExpandedAnswerId(null);
      }
    } catch (err) {
      console.error('Save answer failed:', err);
    } finally {
      setIsSavingAnswer(false);
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
            onClick={() => setShowRegModal(true)}
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
          <button onClick={resetFilters} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <X size={14} /> 필터 초기화
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
              {tab.label}
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900">작업 목록</h2>
              <span className="text-sm text-gray-400">총 {total}건</span>
              {selectedIds.size > 0 && (
                <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                  {selectedIds.size}건 선택
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedPendingOrders.length > 0 && (
                <button
                  onClick={handleBatchProcess}
                  disabled={isBatchProcessing}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                  <Play size={14} />
                  {isBatchProcessing ? '처리 중...' : `실행 (${selectedPendingOrders.length}건)`}
                </button>
              )}
              <button
                onClick={() => fetchOrders()}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm px-2 py-1.5 rounded-lg hover:bg-gray-50"
                title="새로고침"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 cursor-pointer"
                        checked={orders.length > 0 && selectedIds.size === orders.length}
                        onChange={toggleSelectAll}
                      />
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
                    <Fragment key={order.id}>
                      <tr className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 cursor-pointer"
                            checked={selectedIds.has(order.id)}
                            onChange={() => toggleSelectOrder(order.id)}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{order.customer_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{order.product_name || order.product_code}</td>
                        <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatBirthDate(order.customer_birth_date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {order.customer_calendar_type === 'lunar' ? '음력' : order.customer_calendar_type === 'leap' ? '윤달' : '양력'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(order.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {/* 정보수정 */}
                            <button
                              onClick={() => openDetailModal(order)}
                              className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                              title="정보수정"
                            >
                              정보수정
                            </button>
                            {/* 분석지 (PDF) - only for completed orders with non-data products */}
                            {order.status === 'completed' && order.product_code !== 'saju-data' && (
                              <a
                                href={`/api/orders/${order.id}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded transition-colors"
                                title="분석지 PDF"
                              >
                                분석지
                              </a>
                            )}
                            {/* 데이터 - for completed orders */}
                            {order.status === 'completed' && order.result_json && (
                              <button
                                onClick={() => openDataModal(order)}
                                className="px-2 py-1 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded transition-colors"
                                title="원본 데이터"
                              >
                                데이터
                              </button>
                            )}
                            {/* 추가답변 */}
                            {order.status === 'completed' && (
                              <button
                                onClick={() => toggleExtraAnswer(order)}
                                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                                  expandedAnswerId === order.id
                                    ? 'text-yellow-700 bg-yellow-200'
                                    : 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100'
                                }`}
                                title="추가답변"
                              >
                                추가답변
                                {expandedAnswerId === order.id ? <ChevronUp size={12} className="inline ml-0.5" /> : <ChevronDown size={12} className="inline ml-0.5" />}
                              </button>
                            )}
                            {/* 실패시 재분석 */}
                            {order.status === 'failed' && (
                              <button
                                onClick={() => handleReanalyze(order.id)}
                                disabled={reanalyzingId === order.id}
                                className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                                title="재분석"
                              >
                                <RefreshCw size={12} className={`inline mr-0.5 ${reanalyzingId === order.id ? 'animate-spin' : ''}`} />
                                재분석
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* 추가답변 Inline Area */}
                      {expandedAnswerId === order.id && (
                        <tr>
                          <td colSpan={9} className="px-6 py-4 bg-yellow-50 border-b border-yellow-100">
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-yellow-700">추가답변</p>
                              <textarea
                                value={extraAnswerText}
                                onChange={e => setExtraAnswerText(e.target.value)}
                                placeholder="추가 답변을 입력하세요..."
                                rows={3}
                                className="w-full px-3 py-2 border border-yellow-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => saveExtraAnswer(order.id)}
                                  disabled={isSavingAnswer}
                                  className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                                >
                                  {isSavingAnswer ? '저장 중...' : '저장'}
                                </button>
                                <button
                                  onClick={() => setExpandedAnswerId(null)}
                                  className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded-lg"
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
              <p className="text-gray-400 text-sm mt-1">&quot;개별 등록&quot; 버튼으로 분석을 시작해보세요.</p>
            </div>
          )}
        </div>

        {/* ========== 개별 등록 Modal ========== */}
        {showRegModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowRegModal(false)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">개별 등록</h3>
                <button onClick={() => setShowRegModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmitOrder} className="p-6 space-y-4">
                {regError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                    {regError}
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
                          <input type="radio" name="reg-gender" value="male" checked={formGender === 'male'} onChange={e => setFormGender(e.target.value)} className="w-4 h-4 text-blue-600" />
                          <span className="text-sm">남</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="reg-gender" value="female" checked={formGender === 'female'} onChange={e => setFormGender(e.target.value)} className="w-4 h-4 text-blue-600" />
                          <span className="text-sm">여</span>
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">생년월일 *</label>
                        <input
                          type="text"
                          value={formBirthDate}
                          onChange={e => setFormBirthDate(e.target.value)}
                          placeholder="19901231"
                          maxLength={8}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                        <p className="text-[10px] text-gray-400 mt-0.5">숫자 8자리 (예: 19901231)</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">출생시간</label>
                        <input
                          type="text"
                          value={formBirthTime}
                          onChange={e => setFormBirthTime(e.target.value)}
                          placeholder="예: 1430"
                          maxLength={4}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-[10px] text-gray-400 mt-0.5">숫자 4자리 (예: 1430 = 오후 2시30분)</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">간지시간 (선택)</label>
                        <select
                          value={formBirthTimeGanji}
                          onChange={e => setFormBirthTimeGanji(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {ganjiTimes.map(g => (
                            <option key={g.value} value={g.value}>{g.label}</option>
                          ))}
                        </select>
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
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">연락처</label>
                        <input type="tel" value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="010-0000-0000" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">이메일</label>
                        <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="example@email.com" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
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
                      <label className="block text-xs font-medium text-gray-600 mb-1">추가답변 (선택)</label>
                      <textarea
                        value={formExtraAnswer}
                        onChange={e => setFormExtraAnswer(e.target.value)}
                        placeholder="추가로 답변받고 싶은 내용이 있다면 입력하세요"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">내부비고 (선택)</label>
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
                    onClick={() => setShowRegModal(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-lg transition-colors text-sm"
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========== 정보수정 (작업상세) Modal ========== */}
        {showDetailModal && detailOrder && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowDetailModal(false)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">작업 상세</h3>
                <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* 고객 정보 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-gray-800">고객 정보</h4>
                    {!isEditingDetail && (
                      <button onClick={() => setIsEditingDetail(true)} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                        <Edit3 size={12} /> 수정
                      </button>
                    )}
                  </div>

                  {isEditingDetail ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">이름</label>
                          <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">성별</label>
                          <select value={editGender} onChange={e => setEditGender(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                            <option value="male">남</option>
                            <option value="female">여</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">생년월일</label>
                          <input type="text" value={editBirthDate} onChange={e => setEditBirthDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">출생시간</label>
                          <input type="text" value={editBirthTime} onChange={e => setEditBirthTime(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">음양력</label>
                        <select value={editCalendar} onChange={e => setEditCalendar(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                          <option value="solar">양력</option>
                          <option value="lunar">음력</option>
                          <option value="leap">윤달</option>
                        </select>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={handleSaveDetail} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg">저장</button>
                        <button onClick={() => setIsEditingDetail(false)} className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded-lg">취소</button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">이름</span>
                        <span className="text-sm text-gray-900 font-medium">{detailOrder.customer_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">성별</span>
                        <span className="text-sm text-gray-900">{detailOrder.customer_gender === 'male' ? '남' : '여'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">생년월일</span>
                        <span className="text-sm text-gray-900">{formatBirthDate(detailOrder.customer_birth_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">출생시간</span>
                        <span className="text-sm text-gray-900">{detailOrder.customer_birth_time || '미입력'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">음양력</span>
                        <span className="text-sm text-gray-900">
                          {detailOrder.customer_calendar_type === 'lunar' ? '음력' : detailOrder.customer_calendar_type === 'leap' ? '윤달' : '양력'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 상품 정보 */}
                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-3">상품 정보</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">상품</span>
                      <span className="text-sm text-gray-900">{detailOrder.product_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">상품코드</span>
                      <span className="text-sm text-gray-900">{detailOrder.product_code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">상태</span>
                      <span>{getStatusBadge(detailOrder.status)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">생성일</span>
                      <span className="text-sm text-gray-900">{formatDate(detailOrder.created_at)}</span>
                    </div>
                    {detailOrder.completed_at && (
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">완료일</span>
                        <span className="text-sm text-gray-900">{formatDate(detailOrder.completed_at)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex items-center gap-2 pt-2">
                  {detailOrder.status === 'completed' && detailOrder.product_code !== 'saju-data' && (
                    <a
                      href={`/api/orders/${detailOrder.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg"
                    >
                      PDF 보기
                    </a>
                  )}
                  {(detailOrder.status === 'failed' || detailOrder.status === 'pending') && (
                    <button
                      onClick={() => { handleReanalyze(detailOrder.id); setShowDetailModal(false); }}
                      className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg"
                    >
                      재분석
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== 데이터 Modal ========== */}
        {showDataModal && dataOrder && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowDataModal(false)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">사주게이트 원본 데이터</h3>
                <button onClick={() => setShowDataModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                {/* Tabs */}
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setDataTab('summary')}
                    className={`px-3 py-1.5 text-sm rounded-lg border ${dataTab === 'summary' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}
                  >
                    요약 데이터
                  </button>
                  <button
                    onClick={() => setDataTab('full')}
                    className={`px-3 py-1.5 text-sm rounded-lg border ${dataTab === 'full' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}
                  >
                    전체 데이터
                  </button>
                  <div className="ml-auto">
                    <button
                      onClick={() => downloadResultData(dataOrder)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg"
                    >
                      <Download size={14} /> 다운로드
                    </button>
                  </div>
                </div>

                {/* Data Display */}
                <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-[60vh]">
                  <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">
                    {dataTab === 'summary' ? getResultSummary(dataOrder) : getResultDataLines(dataOrder)}
                  </pre>
                </div>

                <p className="text-xs text-gray-400 mt-2">
                  총 {(dataTab === 'summary' ? getResultSummary(dataOrder) : getResultDataLines(dataOrder)).split('\n').length}줄
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
