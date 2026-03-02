'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

interface OrderDetail {
  id: number;
  customer_id: number;
  product_id: number;
  status: string;
  points_used: number;
  extra_answer: string;
  internal_memo: string;
  result_json: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  customer_name: string;
  customer_gender: string;
  customer_birth_date: string;
  customer_birth_time: string;
  customer_calendar_type: string;
  product_name: string;
  product_code: string;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrder();
  }, [params.id]);

  const fetchOrder = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/orders/${params.id}`);
      if (!response.ok) {
        throw new Error('주문을 찾을 수 없습니다.');
      }
      const data = await response.json();
      setOrder(data.order);
    } catch (err) {
      setError('주문 정보를 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        const data = await response.json();
        setOrder(data.order);
      }
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const response = await fetch(`/api/orders/${params.id}/pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `order_${params.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert('PDF 파일을 찾을 수 없습니다.');
      }
    } catch (err) {
      alert('PDF 다운로드 중 오류가 발생했습니다.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'analyzing': case 'processing': return 'bg-blue-100 text-blue-800';
      case 'pdf_generating': return 'bg-orange-100 text-orange-800';
      case 'requested': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: '대기', requested: '요청됨', extracting: '추출중',
      analyzing: '분석중', pdf_generating: 'PDF생성중',
      processing: '처리중', completed: '완료', failed: '실패',
    };
    return statusMap[status] || status;
  };

  const getGenderLabel = (gender: string) => gender === 'male' ? '남' : '여';
  const getCalendarLabel = (type: string) => {
    const map: { [key: string]: string } = { solar: '양력', lunar: '음력', leap: '윤달' };
    return map[type] || type;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-8 flex items-center justify-center min-h-screen">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !order) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error || '주문을 찾을 수 없습니다.'}</p>
            <button onClick={() => router.push('/orders')} className="text-pink-500 hover:text-pink-600 font-medium">
              주문 목록으로 돌아가기
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/orders')}
              className="text-gray-500 hover:text-gray-700"
            >
              ← 목록
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">주문 상세 #{order.id}</h1>
              <p className="text-gray-600 mt-1">
                {new Date(order.created_at).toLocaleString('ko-KR')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {order.status === 'completed' && (
              <button
                onClick={handleDownloadPdf}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg text-sm"
              >
                PDF 다운로드
              </button>
            )}
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
              {getStatusLabel(order.status)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">고객 정보</h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">이름</span>
                <span className="text-sm font-medium text-gray-900">{order.customer_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">성별</span>
                <span className={`text-sm font-medium px-2 py-0.5 rounded ${order.customer_gender === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                  {getGenderLabel(order.customer_gender)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">생년월일</span>
                <span className="text-sm font-medium text-gray-900">{order.customer_birth_date}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">출생시간</span>
                <span className="text-sm font-medium text-gray-900">{order.customer_birth_time || '미입력'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-gray-500">음양력</span>
                <span className="text-sm font-medium text-gray-900">{getCalendarLabel(order.customer_calendar_type)}</span>
              </div>
            </div>
          </div>

          {/* Order Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">주문 정보</h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">상품</span>
                <span className="text-sm font-medium text-gray-900">{order.product_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">상품 코드</span>
                <span className="text-sm text-gray-600">{order.product_code}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">사용 포인트</span>
                <span className="text-sm font-medium text-pink-600">{(order.points_used || 0).toLocaleString()} P</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">생성일</span>
                <span className="text-sm text-gray-600">{new Date(order.created_at).toLocaleString('ko-KR')}</span>
              </div>
              {order.completed_at && (
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-500">완료일</span>
                  <span className="text-sm text-gray-600">{new Date(order.completed_at).toLocaleString('ko-KR')}</span>
                </div>
              )}
              {order.internal_memo && (
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-500">내부 메모</span>
                  <span className="text-sm text-gray-600">{order.internal_memo}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Change */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">상태 변경</h2>
          <div className="flex flex-wrap gap-2">
            {['pending', 'requested', 'extracting', 'analyzing', 'pdf_generating', 'processing', 'completed', 'failed'].map(status => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                disabled={order.status === status}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  order.status === status
                    ? 'bg-pink-500 text-white cursor-default'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {getStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>

        {/* Result JSON */}
        {order.result_json && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">분석 결과</h2>
            <pre className="bg-gray-50 rounded-lg p-4 text-xs text-gray-700 overflow-x-auto max-h-96">
              {JSON.stringify(JSON.parse(order.result_json), null, 2)}
            </pre>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
