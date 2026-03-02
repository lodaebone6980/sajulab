'use client';

import DashboardLayout from '@/components/DashboardLayout';

export default function StaffManagementPage() {
  return (
    <DashboardLayout>
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">직원관리</h1>
          <p className="text-gray-600 mt-2">직원 정보 관리</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-6xl mb-4">🚧</div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">준비 중입니다</h2>
          <p className="text-gray-500">이 기능은 현재 개발 중입니다. 곧 업데이트 될 예정입니다.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
