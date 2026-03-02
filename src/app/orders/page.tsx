'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';

interface Customer {
  id: number;
  name: string;
  gender: string;
  birthDate: string;
  birthTime: string;
  calendarType: string;
  phone: string;
  email: string;
  memo: string;
}

interface Product {
  id: number;
  code: string;
  name: string;
}

interface Order {
  id: number;
  customer_id: number;
  product_id: number;
  status: string;
  created_at: string;
  customer_name: string;
  product_name: string;
  product_code: string;
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter states
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [productFilter, setProductFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, []);

  const fetchOrders = async (
    period = periodFilter,
    from = fromDate,
    to = toDate,
    search = searchQuery,
    product = productFilter,
    status = statusFilter
  ) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (period && period !== 'all') params.append('period', period);
      if (from) params.append('fromDate', from);
      if (to) params.append('toDate', to);
      if (search) params.append('search', search);
      if (product) params.append('product', product);
      if (status && status !== 'all') params.append('status', status);

      const response = await fetch(`/api/orders?${params.toString()}`);
      if (!response.ok) {
        throw new Error('주문 데이터를 불러올 수 없습니다.');
      }
      const data = await response.json();
      setOrders(data.orders || []);
      setError('');
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('주문 데이터를 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handlePeriodClick = (period: string) => {
    setPeriodFilter(period);
    setFromDate('');
    setToDate('');
    fetchOrders(period, '', '', searchQuery, productFilter, statusFilter);
  };

  const handleApplyDateRange = () => {
    setPeriodFilter('');
    fetchOrders('', fromDate, toDate, searchQuery, productFilter, statusFilter);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    fetchOrders(periodFilter, fromDate, toDate, value, productFilter, statusFilter);
  };

  const handleProductFilter = (value: string) => {
    setProductFilter(value);
    fetchOrders(periodFilter, fromDate, toDate, searchQuery, value, statusFilter);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    fetchOrders(periodFilter, fromDate, toDate, searchQuery, productFilter, status);
  };

  const handleRefresh = () => {
    fetchOrders(periodFilter, fromDate, toDate, searchQuery, productFilter, statusFilter);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(new Set(orders.map(o => o.id)));
    } else {
      setSelectedOrders(new Set());
    }
  };

  const handleSelectOrder = (orderId: number, checked: boolean) => {
    const newSelected = new Set(selectedOrders);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'analyzing':
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pdf_generating':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: '대기',
      requested: '요청됨',
      extracting: '추출중',
      analyzing: '분석중',
      pdf_generating: 'PDF생성중',
      processing: '처리중',
      completed: '완료',
      failed: '실패',
    };
    return statusMap[status] || status;
  };

  const countByStatus = (status: string) => {
    if (status === 'all') return orders.length;
    return orders.filter(o => o.status === status).length;
  };

  const statuses = ['all', 'pending', 'requested', 'extracting', 'analyzing', 'pdf_generating', 'processing', 'completed', 'failed'];

  return (
    <DashboardLayout>
      <div className="p-8 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">주문 관리</h1>
            <p className="text-gray-600 mt-2">분석 요청을 관리합니다</p>
          </div>
          <button
            onClick={() => router.push('/orders/new')}
            className="bg-pink-500 hover:bg-pink-600 text-white font-semibold py-2 px-4 rounded-lg"
          >
            + 개별 등록
          </button>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 mb-6">
          {/* Period Filter */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">기간</p>
            <div className="flex flex-wrap gap-2">
              {['오늘', '어제', '최근 3일', '최근 7일', '최근 30일', '전체'].map((label, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePeriodClick(['today', 'yesterday', '3days', '7days', '30days', 'all'][idx])}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    periodFilter === ['today', 'yesterday', '3days', '7days', '30days', 'all'][idx]
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">날짜 범위</p>
            <div className="flex items-center gap-4">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <span className="text-gray-600">~</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <button
                onClick={handleApplyDateRange}
                className="bg-pink-500 hover:bg-pink-600 text-white font-semibold py-2 px-4 rounded-lg text-sm"
              >
                적용
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="이름, 이메일, 휴대폰, 내부비고 검색..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Product Filter */}
          <div className="flex items-center gap-4">
            <select
              value={productFilter}
              onChange={(e) => handleProductFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="">전체 상품</option>
              {products.map(product => (
                <option key={product.id} value={product.id.toString()}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-wrap border-b border-gray-100">
            {statuses.map(status => (
              <button
                key={status}
                onClick={() => handleStatusFilter(status)}
                className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                  statusFilter === status
                    ? 'border-pink-500 text-pink-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {status === 'all' ? '전체' : getStatusLabel(status)}({countByStatus(status)})
              </button>
            ))}
          </div>
        </div>

        {/* Work List Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-6">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">작업 목록</h2>
            <button
              onClick={handleRefresh}
              className="text-pink-500 hover:text-pink-600 font-medium text-sm flex items-center gap-1"
            >
              + 새로고침
            </button>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
              <p className="mt-4 text-gray-600">로딩 중...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-600">{error}</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              작업이 없습니다. 엑셀 파일을 업로드하여 분석을 시작해보세요.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedOrders.size === orders.length && orders.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">고객명</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">상품</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">상태</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">생성일</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">조치</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedOrders.has(order.id)}
                          onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{order.customer_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{order.product_name || order.product_code}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(order.created_at).toISOString().split('T')[0]}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => router.push(`/orders/${order.id}`)}
                          className="text-pink-500 hover:text-pink-600 font-medium"
                        >
                          보기
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
