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
  Bell,
  MessageSquare,
  MessageCircle,
  Globe,
  Bot,
  Megaphone,
  BookOpen,
  UserCog,
  FileText,
  Coins,
  Link2,
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
    { icon: Bell, label: '공지사항', href: '/notices', badge: 'NEW' },
    { icon: LayoutDashboard, label: '대시보드', href: '/dashboard' },
    { icon: ShoppingCart, label: '주문 관리', href: '/orders' },
    { icon: Users, label: '고객 관리', href: '/customers' },
    { icon: MessageSquare, label: '상담 기록', href: '/consultations' },
    { icon: MessageCircle, label: '상담 V3', href: '/consultations-v3', badge: 'NEW' },
    { icon: Globe, label: '랜딩페이지', href: '/landing-pages', badge: 'AI' },
    { icon: Bot, label: '자동화', href: '/automation', badge: 'AI' },
    { icon: Megaphone, label: '마케팅', href: '/marketing' },
    { icon: BookOpen, label: '일지', href: '/daily-log' },
    { icon: UserCog, label: '직원관리', href: '/staff-management', badge: 'NEW' },
    { icon: Package, label: '상품 관리', href: '/products' },
    { icon: FileText, label: 'PDF 디자인', href: '/pdf-design' },
    { icon: Coins, label: '포인트', href: '/points' },
    { icon: Link2, label: '링크 모음', href: '/resources' },
    { icon: Settings, label: '설정', href: '/settings' },
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

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'NEW': return 'bg-red-500 text-white';
      case 'AI': return 'bg-purple-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">
          <span className="text-gray-800">사주</span>
          <span className="text-pink-500">연구소</span>
        </h1>
        <p className="text-xs text-gray-400 mt-1">수강생 여러분과 함께 만들어가는 이야기</p>
      </div>

      {/* User Info */}
      {user && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="mb-2">
            <p className="text-sm font-semibold text-gray-800">{user.name}</p>
            <p className="text-xs text-gray-500">포인트: <span className="text-pink-500 font-medium">{user.points.toLocaleString()}P</span></p>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-200 text-sm ${
                active
                  ? 'bg-pink-50 text-pink-600 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={18} />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${getBadgeColor(item.badge)}`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <LogOut size={18} />
          <span>{isLoggingOut ? '로그아웃 중...' : '로그아웃'}</span>
        </button>
      </div>
    </aside>
  );
}
