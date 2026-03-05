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
  PanelLeftClose,
  Flame,
  Heart,
  HelpCircle,
  BarChart3,
} from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  user?: {
    name: string;
    email: string;
    points: number;
  };
}

type BadgeType = 'NEW' | 'AI' | '구현예정';

interface MenuItem {
  icon: any;
  label: string;
  href: string;
  badges?: BadgeType[];
  bgStyle?: 'pink' | 'purple' | 'none';
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const menuItems: MenuItem[] = [
    { icon: Bell, label: '공지사항', href: '/notices', badges: ['NEW'], bgStyle: 'pink' },
    { icon: LayoutDashboard, label: '대시보드', href: '/dashboard', bgStyle: 'none' },
    { icon: BarChart3, label: '분석 주문 관리', href: '/orders', bgStyle: 'none' },
    { icon: Heart, label: '궁합 주문 관리', href: '/compatibility', badges: ['NEW'], bgStyle: 'pink' },
    { icon: HelpCircle, label: '추가 질문 관리', href: '/questions', badges: ['NEW'], bgStyle: 'purple' },
    { icon: Users, label: '고객 관리', href: '/customers', bgStyle: 'none' },
    { icon: MessageSquare, label: '상담 기록', href: '/consultations', bgStyle: 'none' },
    { icon: MessageCircle, label: '상담 V3', href: '/consultations-v3', badges: ['NEW'], bgStyle: 'purple' },
    { icon: Globe, label: '랜딩페이지', href: '/landing-pages', badges: ['AI'], bgStyle: 'purple' },
    { icon: Bot, label: '자동화', href: '/automation', badges: ['AI', '구현예정'], bgStyle: 'none' },
    { icon: Megaphone, label: '마케팅', href: '/marketing', bgStyle: 'none' },
    { icon: BookOpen, label: '일지', href: '/daily-log', bgStyle: 'none' },
    { icon: UserCog, label: '직원관리', href: '/staff-management', badges: ['NEW'], bgStyle: 'purple' },
    { icon: Package, label: '상품 관리', href: '/products', bgStyle: 'none' },
    { icon: FileText, label: 'PDF 디자인', href: '/pdf-design', bgStyle: 'none' },
    { icon: Coins, label: '포인트', href: '/points', bgStyle: 'none' },
    { icon: Link2, label: '링크 모음', href: '/resources', bgStyle: 'none' },
    { icon: Settings, label: '설정', href: '/settings', bgStyle: 'none' },
  ];

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  const getBadgeStyle = (badge: BadgeType) => {
    switch (badge) {
      case 'NEW':
        return 'bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full';
      case 'AI':
        return 'bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full';
      case '구현예정':
        return 'bg-amber-100 text-amber-700 text-[10px] font-medium px-1.5 py-0.5 rounded';
      default:
        return 'bg-gray-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full';
    }
  };

  const getItemBgClass = (item: MenuItem, active: boolean) => {
    if (active) {
      return 'bg-blue-50 text-blue-700 font-semibold';
    }
    switch (item.bgStyle) {
      case 'pink':
        return 'bg-gradient-to-r from-pink-50 to-red-50 text-pink-600 font-medium';
      case 'purple':
        return 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 font-medium';
      default:
        return 'text-gray-600 hover:bg-gray-50';
    }
  };

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col h-screen shrink-0">
      {/* Logo */}
      <div className="px-5 pt-5 pb-3 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-gray-800" style={{ fontStyle: 'italic' }}>사주</span>
              <span className="text-pink-500" style={{ fontStyle: 'italic' }}>연구소</span>
            </h1>
            <p className="text-[10px] text-gray-400 tracking-wider mt-0.5">SAJULAB.KR</p>
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded mt-1"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">수강생 여러분과 함께 만들어가는 이야기</p>
      </div>

      {/* User Info */}
      {user && (
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-800">{user.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            포인트: <span className="text-pink-500 font-semibold">{user.points.toLocaleString()}P</span>
          </p>
        </div>
      )}

      {/* Menu Items */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 text-[13px] ${getItemBgClass(item, active)}`}
            >
              <Icon size={17} className="shrink-0" />
              <span className="flex-1">{item.label}</span>
              <div className="flex items-center gap-1">
                {item.badges?.map((badge, i) => (
                  <span key={i} className={getBadgeStyle(badge)}>
                    {badge}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="px-3 py-3 border-t border-gray-100">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors duration-200 disabled:opacity-50 text-[13px]"
        >
          <LogOut size={17} />
          <span>{isLoggingOut ? '로그아웃 중...' : '로그아웃'}</span>
        </button>
      </div>
    </aside>
  );
}
