'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Settings,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  user?: {
    name: string;
    email: string;
    points: number;
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: '대시보드', href: '/dashboard' },
    { icon: ShoppingCart, label: '주문 관리', href: '/dashboard/orders' },
    { icon: Users, label: '고객 관리', href: '/dashboard/customers' },
    { icon: Package, label: '상품 관리', href: '/dashboard/products' },
    { icon: Settings, label: '설정', href: '/dashboard/settings' },
  ];

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">사주연구소</h1>
      </div>

      {/* User Info */}
      {user && (
        <div className="p-6 border-b border-gray-200">
          <div className="mb-2">
            <p className="text-sm font-semibold text-gray-800">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <div className="bg-gray-50 rounded px-3 py-2">
            <p className="text-xs text-gray-600">포인트: {user.points.toLocaleString()}P</p>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                active
                  ? 'bg-pink-50 text-pink-600 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogOut size={20} />
          <span>{isLoggingOut ? '로그아웃 중...' : '로그아웃'}</span>
        </button>
      </div>
    </aside>
  );
}
