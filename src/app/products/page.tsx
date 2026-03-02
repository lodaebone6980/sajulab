'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

interface Product {
  id: number;
  name: string;
  code: string;
  description: string;
  price_points: number;
  is_active: number;
  sort_order: number;
  cover_image: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/products', {
          method: 'GET',
        });

        if (!response.ok) {
          setError('상품 정보를 불러올 수 없습니다.');
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        setProducts(data.products || []);
        setError('');
      } catch (err) {
        console.error('Fetch products error:', err);
        setError('상품 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Format points with comma separator
  const formatPoints = (points: number) => {
    return points.toLocaleString('ko-KR');
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">상품 관리</h1>
          <p className="text-gray-600 mt-2">상품을 클릭하여 PDF 포지를 설정할 수 있습니다</p>
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
            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.length > 0 ? (
                products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                  >
                    {/* Product Image Area */}
                    <div className="relative w-full h-40 bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
                      {product.cover_image ? (
                        <img
                          src={product.cover_image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center text-gray-400">
                          <svg
                            className="w-12 h-12 mx-auto"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}

                      {/* Badge */}
                      <div className="absolute top-3 right-3">
                        {product.is_active ? (
                          <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                            활성
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">
                            비활성
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      {/* Product Name */}
                      <h3 className="font-semibold text-gray-900 text-lg mb-4">{product.name}</h3>

                      {/* Product Details */}
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">상품 코드:</span>
                          <span className="font-mono text-gray-900">{product.code}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">포인트:</span>
                          <span className="font-bold text-lg text-pink-600">
                            {formatPoints(product.price_points)} P
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-600 border-t pt-3">
                        {product.description}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-gray-500">
                  등록된 상품이 없습니다.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
