'use client';

import React, { useEffect, useState, useCallback, Fragment } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { FileText, X, Search, Filter, Download, Plus, Eye, Database, MessageSquare, Edit3, RefreshCw, ChevronDown, ChevronUp, Play, CheckSquare, Upload, Users, List, UserPlus } from 'lucide-react';

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
  progress?: number;
  progress_message?: string;
  google_drive_url?: string;
  phone?: string;
  email?: string;
  order_code?: string;
  customer_code?: string;
  nickname?: string;
}

interface CustomerGroup {
  customer_id: number;
  customer_code: string;
  customer_name: string;
  customer_nickname: string;
  customer_gender: string;
  customer_birth_date: string;
  customer_birth_time: string;
  customer_calendar_type: string;
  phone: string;
  email: string;
  orders: Order[];
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
  const [formNickname, setFormNickname] = useState('');
  const [formCode2, setFormCode2] = useState('');
  const [formAccount, setFormAccount] = useState('');
  const [formExtraQuestion, setFormExtraQuestion] = useState('');

  // 그룹뷰
  const [viewMode, setViewMode] = useState<'group' | 'list'>('group');
  const [customerGroups, setCustomerGroups] = useState<CustomerGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  // 고객 불러오기
  const [showLoadCustomerModal, setShowLoadCustomerModal] = useState(false);
  const [loadCustomerSearch, setLoadCustomerSearch] = useState('');
  const [loadCustomerList, setLoadCustomerList] = useState<any[]>([]);
  const [reusedCustomerId, setReusedCustomerId] = useState<number | null>(null);

  // 엑셀 업로드
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelProductCode, setExcelProductCode] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

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

  const fetchOrders = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (period !== 'all') params.set('period', period);
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (productFilter) params.set('product', productFilter);

      if (viewMode === 'group') {
        params.set('grouped', 'true');
        const response = await fetch(`/api/orders?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setCustomerGroups(data.customer_groups || []);
          setTotal(data.total || 0);
          // 모든 그룹 기본 펼침
          if (expandedGroups.size === 0 && data.customer_groups?.length > 0) {
            setExpandedGroups(new Set(data.customer_groups.map((g: any) => g.customer_id)));
          }
          // flat list도 업데이트 (폴링 호환)
          const flatOrders = (data.customer_groups || []).flatMap((g: any) => g.orders);
          setOrders(flatOrders);
        }
      } else {
        const response = await fetch(`/api/orders?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setOrders(data.orders || []);
          setTotal(data.total || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [period, fromDate, toDate, search, statusFilter, productFilter, viewMode]);

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

  // 진행 중인 주문이 있으면 3초마다 자동 polling (로딩 표시 없이)
  useEffect(() => {
    const activeStatuses = ['requested', 'extracting', 'analyzing', 'pdf_generating', 'processing'];
    const hasActiveOrders = orders.some(o => activeStatuses.includes(o.status));
    if (!hasActiveOrders) return;

    const interval = setInterval(() => {
      fetchOrders(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [orders, fetchOrders]);

  const resetFilters = () => {
    setPeriod('all');
    setFromDate('');
    setToDate('');
    setSearch('');
    setStatusFilter('all');
    setProductFilter('');
  };

  // === 엑셀 업로드 ===
  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      setExcelData(rows as any[]);
      setUploadResult(null);
    } catch (err) {
      console.error('Excel parse error:', err);
      alert('엑셀 파일을 읽는데 실패했습니다.');
    }
    // Reset file input
    e.target.value = '';
  };

  const handleExcelUpload = async () => {
    if (excelData.length === 0 || !excelProductCode) return;
    setIsUploading(true);
    setUploadResult(null);
    try {
      const res = await fetch('/api/orders/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: excelData, productCode: excelProductCode }),
      });
      const result = await res.json();
      setUploadResult(result);
      if (result.success) {
        fetchOrders();
      }
    } catch (err) {
      setUploadResult({ error: '업로드 중 오류가 발생했습니다.' });
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status: string, progress?: number, progressMessage?: string) => {
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

    // 진행 중인 상태일 때 프로그레스 바 표시
    const isActive = ['requested', 'extracting', 'analyzing', 'pdf_generating', 'processing'].includes(status);
    if (isActive && progress !== undefined && progress > 0) {
      const barColor = status === 'pdf_generating' ? 'bg-purple-500' : 'bg-blue-500';
      return (
        <div className="min-w-[120px]">
          <div className="flex items-center justify-between mb-1">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${styles[status] || styles.pending}`}>
              {labels[status] || status}
            </span>
            <span className="text-[11px] font-semibold text-gray-600">{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor} rounded-full`}
              style={{ width: `${Math.min(progress, 100)}%`, transition: 'width 0.5s ease' }}
            />
          </div>
          {progressMessage && (
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">{progressMessage}</p>
          )}
        </div>
      );
    }

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

  // 그룹 토글
  const toggleGroup = (customerId: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId); else next.add(customerId);
      return next;
    });
  };

  // 고객 불러오기
  const fetchCustomersForLoad = async (q: string) => {
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setLoadCustomerList(data.customers || []);
      }
    } catch {}
  };
  const loadCustomerData = (cus: any) => {
    setFormName(cus.name || '');
    setFormGender(cus.gender || 'male');
    setFormBirthDate(cus.birth_date || '');
    setFormBirthTime(cus.birth_time || '');
    setFormCalendarType(cus.calendar_type || 'solar');
    setFormPhone(cus.phone || '');
    setFormEmail(cus.email || '');
    setFormNickname(cus.nickname || '');
    setReusedCustomerId(cus.id);
    setShowLoadCustomerModal(false);
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
          nickname: formNickname,
          code2: formCode2,
          account: formAccount,
          extraQuestion: formExtraQuestion,
          ...(reusedCustomerId ? { customerId: reusedCustomerId } : {}),
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
      setFormNickname(''); setFormCode2(''); setFormAccount(''); setFormExtraQuestion('');
      setReusedCustomerId(null);
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
    if (!confirm('이 주문을 재분석하시겠습니까?\n기존 분석 결과가 새로 덮어씌워집니다.')) return;
    setReanalyzingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reanalyze' }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || '재분석 요청 실패');
      }
      fetchOrders();
    } catch (err) {
      console.error('Reanalyze failed:', err);
      alert('재분석 요청 중 오류가 발생했습니다.');
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
        // 1초 후 새로고침 (상태 반영) - 이후 auto-polling이 3초마다 진행 감시
        setTimeout(() => fetchOrders(), 1000);
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
          <div className="flex items-center gap-2">
            {/* 뷰 전환 토글 */}
            <div className="flex items-center bg-gray-200 rounded-lg p-0.5 mr-2">
              <button
                onClick={() => setViewMode('group')}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'group' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                <Users size={14} />
                그룹뷰
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                <List size={14} />
                리스트뷰
              </button>
            </div>
            <button
              onClick={() => setShowExcelModal(true)}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Upload size={16} />
              엑셀 등록
            </button>
            <button
              onClick={() => setShowRegModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} />
              개별 등록
            </button>
          </div>
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

          {/* ========== 그룹뷰 ========== */}
          {viewMode === 'group' && customerGroups.length > 0 && (
            <div className="space-y-3">
              {customerGroups.map(group => {
                const isExpanded = expandedGroups.has(group.customer_id);
                return (
                  <div key={group.customer_id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {/* 고객 헤더 */}
                    <div
                      onClick={() => toggleGroup(group.customer_id)}
                      className="flex items-center gap-3 px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      <span className="font-bold text-gray-900">{group.customer_name}</span>
                      {group.customer_code && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono">{group.customer_code}</span>
                      )}
                      {group.customer_nickname && (
                        <span className="text-xs text-gray-500">({group.customer_nickname})</span>
                      )}
                      <span className={`text-xs px-1.5 py-0.5 rounded ${group.customer_gender === 'male' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                        {group.customer_gender === 'male' ? '남' : '여'}
                      </span>
                      <span className="text-xs text-gray-500">{group.customer_birth_date}</span>
                      <span className="ml-auto text-xs text-gray-400">{group.orders.length}건</span>
                    </div>
                    {/* 주문 목록 */}
                    {isExpanded && (
                      <div className="divide-y divide-gray-100">
                        {group.orders.map((order: any) => (
                          <div key={order.id} className="flex items-center gap-3 px-6 py-2.5 hover:bg-gray-50 transition-colors text-sm">
                            <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded font-mono min-w-[80px]">{order.order_code || `#${order.id}`}</span>
                            <span className="text-gray-900 min-w-[100px]">{order.product_name}</span>
                            <span>{getStatusBadge(order.status, order.progress, order.progress_message)}</span>
                            {order.consultation_date && (
                              <span className="text-xs text-gray-400">상담: {order.consultation_date}</span>
                            )}
                            <span className="text-xs text-gray-400 ml-auto">{formatDate(order.created_at)}</span>
                            <div className="flex items-center gap-1">
                              {order.status === 'completed' && order.pdf_url && (
                                <a href={order.pdf_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                                  <Download size={14} />
                                </a>
                              )}
                              {order.google_drive_url && (
                                <a href={order.google_drive_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Google Drive">
                                  <FileText size={14} />
                                </a>
                              )}
                              <button onClick={() => { setDetailOrder(order); setShowDetailModal(true); }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded">
                                <Eye size={14} />
                              </button>
                              {order.result_json && (
                                <button onClick={() => { setDataOrder(order); setShowDataModal(true); setDataTab('summary'); }} className="p-1.5 text-purple-500 hover:bg-purple-50 rounded">
                                  <Database size={14} />
                                </button>
                              )}
                              {(order.status === 'pending' || order.status === 'failed') && (
                                <button onClick={() => handleReanalyze(order.id)} disabled={reanalyzingId === order.id} className="p-1.5 text-orange-500 hover:bg-orange-50 rounded disabled:opacity-50">
                                  <Play size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 그룹뷰에서 데이터 없을 때 */}
          {viewMode === 'group' && customerGroups.length === 0 && !isLoading && (
            <div className="py-20 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <FileText size={28} className="text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">작업이 없습니다.</p>
              <p className="text-gray-400 text-sm mt-1">&quot;개별 등록&quot; 버튼으로 분석을 시작해보세요.</p>
            </div>
          )}

          {/* ========== 리스트뷰 (기존) ========== */}
          {viewMode === 'list' && orders.length > 0 ? (
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
                        <td className="px-4 py-3">{getStatusBadge(order.status, order.progress, order.progress_message)}</td>
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
                            {/* Google Drive 링크 */}
                            {order.status === 'completed' && order.google_drive_url && (
                              <a
                                href={order.google_drive_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                                title="Google Drive에서 보기"
                              >
                                Drive
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
                            {/* 재분석 - 실패/완료/분석중(멈춤) 모두 가능 */}
                            {['failed', 'completed', 'analyzing', 'pdf_generating'].includes(order.status) && (
                              <button
                                onClick={() => handleReanalyze(order.id)}
                                disabled={reanalyzingId === order.id}
                                className={`px-2 py-1 text-xs font-medium rounded transition-colors disabled:opacity-50 ${
                                  order.status === 'failed'
                                    ? 'text-red-600 bg-red-50 hover:bg-red-100'
                                    : 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                                }`}
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
          ) : viewMode === 'list' ? (
            <div className="py-20 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <FileText size={28} className="text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">작업이 없습니다.</p>
              <p className="text-gray-400 text-sm mt-1">&quot;개별 등록&quot; 버튼으로 분석을 시작해보세요.</p>
            </div>
          ) : null}
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
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-gray-800">고객 정보</h4>
                    <button
                      type="button"
                      onClick={() => { setShowLoadCustomerModal(true); fetchCustomersForLoad(''); }}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <UserPlus size={14} />
                      기존 고객 불러오기
                    </button>
                  </div>
                  {reusedCustomerId && (
                    <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs mb-3 flex items-center justify-between">
                      <span>기존 고객 연결됨 (ID: {reusedCustomerId})</span>
                      <button type="button" onClick={() => setReusedCustomerId(null)} className="text-blue-500 hover:text-blue-700">해제</button>
                    </div>
                  )}
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
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">닉네임</label>
                        <input type="text" value={formNickname} onChange={e => setFormNickname(e.target.value)} placeholder="닉네임" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">코드2</label>
                        <input type="text" value={formCode2} onChange={e => setFormCode2(e.target.value)} placeholder="코드2" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">계정</label>
                        <input type="text" value={formAccount} onChange={e => setFormAccount(e.target.value)} placeholder="계정" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
                      <label className="block text-xs font-medium text-gray-600 mb-1">추가질문</label>
                      <textarea
                        value={formExtraQuestion}
                        onChange={e => setFormExtraQuestion(e.target.value)}
                        placeholder="고객의 추가 질문 내용"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
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
                  {['failed', 'pending', 'completed', 'analyzing', 'pdf_generating'].includes(detailOrder.status) && (
                    <button
                      onClick={() => { handleReanalyze(detailOrder.id); setShowDetailModal(false); }}
                      disabled={reanalyzingId === detailOrder.id}
                      className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={`inline mr-1 ${reanalyzingId === detailOrder.id ? 'animate-spin' : ''}`} />
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

        {/* ========== 엑셀 업로드 Modal ========== */}
        {showExcelModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setShowExcelModal(false); setExcelData([]); setUploadResult(null); }}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">엑셀 등록</h3>
                <button onClick={() => { setShowExcelModal(false); setExcelData([]); setUploadResult(null); }} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600">
                  엑셀 파일(.xlsx)을 업로드하면 자동으로 주문이 일괄 등록됩니다.<br />
                  <span className="text-gray-400">필수 컬럼: 이름, 생년월일, 성별 | 선택: 양/음력, 탄생시각, 닉네임, 코드2, 계정, 추가질문</span>
                </p>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">상품 선택 *</label>
                    <select
                      value={excelProductCode}
                      onChange={e => setExcelProductCode(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">상품을 선택하세요</option>
                      {products.map(product => (
                        <option key={product.id} value={product.code}>
                          {product.name} ({product.price_points?.toLocaleString() || 0} P)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">엑셀 파일</label>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleExcelFileChange}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 file:mr-2 file:py-1 file:px-3 file:border-0 file:text-sm file:bg-green-50 file:text-green-700 file:rounded"
                    />
                  </div>
                </div>

                {excelData.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-2">미리보기 ({excelData.length}건)</h4>
                    <div className="max-h-64 overflow-auto border border-gray-200 rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600">#</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600">이름</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600">성별</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600">생년월일</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600">양/음력</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600">탄생시각</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600">닉네임</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600">추가질문</th>
                          </tr>
                        </thead>
                        <tbody>
                          {excelData.slice(0, 50).map((row, i) => (
                            <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                              <td className="px-2 py-1 text-gray-400">{i + 1}</td>
                              <td className="px-2 py-1 font-medium">{row['이름'] || '-'}</td>
                              <td className="px-2 py-1">{row['성별'] || '-'}</td>
                              <td className="px-2 py-1">{String(row['생년월일'] || '-').slice(0, 10)}</td>
                              <td className="px-2 py-1">{row['양/음력'] || '-'}</td>
                              <td className="px-2 py-1">{row['탄생시각'] || '-'}</td>
                              <td className="px-2 py-1">{row['닉네임'] || '-'}</td>
                              <td className="px-2 py-1 max-w-[200px] truncate">{row['추가질문'] || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {excelData.length > 50 && <p className="text-xs text-gray-400 mt-1">... 외 {excelData.length - 50}건 더</p>}
                  </div>
                )}

                {uploadResult && (
                  <div className={`p-3 rounded-lg text-sm ${uploadResult.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                    {uploadResult.success ? (
                      <>
                        <p className="font-medium">{uploadResult.message}</p>
                        {uploadResult.failCount > 0 && (
                          <div className="mt-2 text-xs">
                            <p className="font-medium text-red-600">실패 항목:</p>
                            {uploadResult.results?.filter((r: any) => !r.success).map((r: any, i: number) => (
                              <p key={i}>{r.row}행: {r.name || '이름없음'} - {r.error}</p>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p>{uploadResult.error}</p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleExcelUpload}
                    disabled={isUploading || excelData.length === 0 || !excelProductCode}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
                  >
                    {isUploading ? '업로드 중...' : `${excelData.length}건 일괄 등록`}
                  </button>
                  <button
                    onClick={() => { setShowExcelModal(false); setExcelData([]); setUploadResult(null); }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-lg transition-colors text-sm"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ========== 고객 불러오기 Modal ========== */}
        {showLoadCustomerModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]" onClick={() => setShowLoadCustomerModal(false)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[70vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">기존 고객 선택</h3>
                <button onClick={() => setShowLoadCustomerModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>
              <div className="p-4">
                <input
                  type="text"
                  placeholder="고객명 검색..."
                  value={loadCustomerSearch}
                  onChange={e => { setLoadCustomerSearch(e.target.value); fetchCustomersForLoad(e.target.value); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  autoFocus
                />
                <div className="max-h-[45vh] overflow-y-auto space-y-1">
                  {loadCustomerList.filter((c: any) => {
                    if (!loadCustomerSearch) return true;
                    const q = loadCustomerSearch.toLowerCase();
                    return c.name?.toLowerCase().includes(q) || c.nickname?.toLowerCase().includes(q) || c.customer_code?.toLowerCase().includes(q);
                  }).map((cus: any) => (
                    <div
                      key={cus.id}
                      onClick={() => loadCustomerData(cus)}
                      className="p-3 rounded-lg cursor-pointer hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900">{cus.name}</span>
                        {cus.customer_code && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">{cus.customer_code}</span>}
                        {cus.nickname && <span className="text-xs text-gray-400">({cus.nickname})</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {cus.gender === 'male' ? '남' : '여'} · {cus.birth_date}
                        {cus.calendar_type === 'lunar' ? ' · 음력' : cus.calendar_type === 'leap' ? ' · 윤달' : ''}
                      </div>
                    </div>
                  ))}
                  {loadCustomerList.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-8">고객 데이터가 없습니다.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
