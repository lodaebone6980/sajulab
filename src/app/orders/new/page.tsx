'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

interface Product {
  id: number;
  name: string;
  code: string;
  price_points: number;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [gender, setGender] = useState('male');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [calendarType, setCalendarType] = useState('solar');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [memo, setMemo] = useState('');
  const [productId, setProductId] = useState('');
  const [internalMemo, setInternalMemo] = useState('');
  const [nickname, setNickname] = useState('');
  const [code2, setCode2] = useState('');
  const [account, setAccount] = useState('');
  const [extraQuestion, setExtraQuestion] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !birthDate || !productId) {
      setError('이름, 생년월일, 상품은 필수 입력입니다.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const selectedProduct = products.find(p => p.id === parseInt(productId));
      if (!selectedProduct) {
        throw new Error('상품을 선택해주세요.');
      }

      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name,
          birthDate,
          birthTime,
          gender,
          calendarType,
          productCode: selectedProduct.code,
          phone,
          email,
          memo,
          internalMemo,
          nickname,
          code2,
          account,
          extraQuestion,
        }),
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json();
        throw new Error(errData.error || '주문 등록에 실패했습니다.');
      }

      const orderData = await orderRes.json();
      router.push(`/orders/${orderData.orderId || ''}`);
    } catch (err: any) {
      setError(err.message || '주문 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => router.push('/orders')}
            className="text-gray-500 hover:text-gray-700"
          >
            ← 목록
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">개별 등록</h1>
            <p className="text-gray-600 mt-1">새로운 분석 요청을 등록합니다</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Customer Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">고객 정보</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="고객 이름을 입력하세요"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="gender" value="male" checked={gender === 'male'} onChange={e => setGender(e.target.value)} className="w-4 h-4 text-pink-500" />
                    <span className="text-sm">남</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="gender" value="female" checked={gender === 'female'} onChange={e => setGender(e.target.value)} className="w-4 h-4 text-pink-500" />
                    <span className="text-sm">여</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">생년월일 *</label>
                  <input
                    type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">출생시간</label>
                  <input
                    type="time" value={birthTime} onChange={e => setBirthTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">닉네임</label>
                  <input
                    type="text" value={nickname} onChange={e => setNickname(e.target.value)}
                    placeholder="닉네임"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">코드2</label>
                  <input
                    type="text" value={code2} onChange={e => setCode2(e.target.value)}
                    placeholder="코드2"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">계정</label>
                  <input
                    type="text" value={account} onChange={e => setAccount(e.target.value)}
                    placeholder="계정"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">음양력</label>
                <select
                  value={calendarType} onChange={e => setCalendarType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="solar">양력</option>
                  <option value="lunar">음력</option>
                  <option value="leap">윤달</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
                  <input
                    type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
                <textarea
                  value={memo} onChange={e => setMemo(e.target.value)}
                  placeholder="고객 관련 메모"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>
          </div>

          {/* Order Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">주문 정보</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상품 *</label>
                <select
                  value={productId} onChange={e => setProductId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">추가질문</label>
                <textarea
                  value={extraQuestion} onChange={e => setExtraQuestion(e.target.value)}
                  placeholder="고객의 추가 질문 내용"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">내부 메모</label>
                <textarea
                  value={internalMemo} onChange={e => setInternalMemo(e.target.value)}
                  placeholder="내부 관리용 메모"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-pink-500 hover:bg-pink-600 disabled:bg-pink-300 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              {isSubmitting ? '등록 중...' : '주문 등록'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/orders')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-8 rounded-lg transition-colors"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
