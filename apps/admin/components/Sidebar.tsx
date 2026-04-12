'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, ShoppingBag, Truck, Users, MapPin, Tag, Image, Bell,
  Settings, FileText, HeadphonesIcon, DollarSign, LogOut, Menu, X,
  Search, ChevronRight, Sun, Moon, Shirt,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useAdminAuthStore } from '@/lib/store';
import { canAccessHref } from '@/lib/permissions';

function LogoImage() {
  return (
    <div className="relative w-8 h-8 flex-shrink-0">
      <img
        src="/logo.png"
        alt="LNB"
        className="w-8 h-8 rounded-lg shadow-md"
        onError={(e) => {
          const el = e.currentTarget;
          el.style.display = 'none';
          (el.nextElementSibling as HTMLElement)?.style.setProperty('display', 'flex');
        }}
      />
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white items-center justify-center text-[10px] font-black shadow-md absolute inset-0" style={{ display: 'none' }}>
        LNB
      </div>
    </div>
  );
}

const navSections = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Management',
    items: [
      { href: '/dashboard/orders', label: 'Orders', icon: ShoppingBag },
      { href: '/dashboard/drivers', label: 'Drivers', icon: Truck },
      { href: '/dashboard/customers', label: 'Customers', icon: Users },
      { href: '/dashboard/outlets', label: 'Outlets', icon: MapPin },
      { href: '/dashboard/services', label: 'Services', icon: Shirt },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/dashboard/offers', label: 'Offers', icon: Tag },
      { href: '/dashboard/banners', label: 'Banners', icon: Image },
      { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/dashboard/cod', label: 'COD Management', icon: DollarSign },
      { href: '/dashboard/reports', label: 'Reports', icon: FileText },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/dashboard/support', label: 'Support', icon: HeadphonesIcon },
      { href: '/dashboard/config', label: 'Configuration', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAdminAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD';

  return (
    <>
      <aside className={cn(
        'fixed top-0 left-0 h-full bg-surface border-r border-border z-40 transition-all duration-200 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}>
        {/* Header */}
        <div className={cn(
          'h-14 flex items-center border-b border-border',
          collapsed ? 'justify-center px-2' : 'justify-between px-4'
        )}>
          {!collapsed ? (
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <LogoImage />
              <span className="font-bold text-text-primary tracking-tight whitespace-nowrap overflow-hidden">
                Admin
              </span>
            </Link>
          ) : (
            <Link href="/dashboard">
              <LogoImage />
            </Link>
          )}
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collapse toggle when collapsed */}
        {collapsed && (
          <button onClick={() => setCollapsed(false)} className="h-10 flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors">
            <Menu className="w-4 h-4" />
          </button>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navSections.map((section, sIdx) => (
            <div key={section.label} className={cn(sIdx > 0 && 'mt-5')}>
              {!collapsed && (
                <div className="px-3 mb-1.5 text-[10px] font-semibold text-text-tertiary uppercase tracking-widest">
                  {section.label}
                </div>
              )}
              {collapsed && sIdx > 0 && (
                <div className="mx-2 mb-2 border-t border-border" />
              )}
              {section.items.filter((item) => canAccessHref(user?.adminRole, item.href)).map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
                const isExactDashboard = item.href === '/dashboard' && pathname === '/dashboard';
                const active = isActive || isExactDashboard;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={cn(
                      'flex items-center gap-3 rounded-lg mb-0.5 text-[13px] font-medium transition-all whitespace-nowrap overflow-hidden',
                      collapsed ? 'justify-center px-0 py-2.5 mx-1' : 'px-3 py-2',
                      active
                        ? 'bg-brand text-white shadow-sm'
                        : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
                    )}
                  >
                    <item.icon className={cn('w-[18px] h-[18px] flex-shrink-0', active && 'text-white')} strokeWidth={1.75} />
                    {!collapsed && item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-2">
          {/* User Info */}
          {!collapsed && user && (
            <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-text-primary truncate">{user.name || user.phone}</p>
                <p className="text-[10px] text-text-tertiary uppercase">{user.adminRole || user.role}</p>
              </div>
            </div>
          )}
          {collapsed && user && (
            <div className="flex justify-center py-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-[10px] font-bold" title={user.name || user.phone}>
                {initials}
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Logout"
            className={cn(
              'flex items-center gap-3 w-full rounded-lg text-sm text-text-secondary hover:bg-error-light hover:text-error transition-colors',
              collapsed ? 'justify-center px-0 py-2.5 mx-1' : 'px-3 py-2'
            )}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Spacer */}
      <div className={cn('flex-shrink-0 transition-all duration-200', collapsed ? 'w-16' : 'w-64')} />
    </>
  );
}

const breadcrumbLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  drivers: 'Drivers',
  customers: 'Customers',
  outlets: 'Outlets',
  services: 'Services',
  offers: 'Offers',
  banners: 'Banners',
  notifications: 'Notifications',
  cod: 'COD Management',
  reports: 'Reports',
  support: 'Support',
  config: 'Configuration',
};

export function AdminTopBar() {
  const pathname = usePathname();
  const { user } = useAdminAuthStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD';

  useEffect(() => {
    setMounted(true);
  }, []);

  // Build breadcrumb from pathname
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = segments.map((seg, i) => ({
    label: breadcrumbLabels[seg] || (seg.length > 20 ? 'Detail' : seg.charAt(0).toUpperCase() + seg.slice(1)),
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));

  return (
    <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-border h-14 flex items-center justify-between px-6">
      {/* Left — Breadcrumb */}
      <div>
        <div className="flex items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3 text-text-tertiary" />}
              {crumb.isLast ? (
                <span className="font-semibold text-text-primary">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="text-text-secondary hover:text-text-primary transition-colors">
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-text-tertiary">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Center — Search */}
      <div className="hidden md:flex items-center flex-1 max-w-sm mx-8">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search orders, customers..."
            className="w-full h-9 pl-9 pr-4 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
          />
        </div>
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-3">
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" strokeWidth={1.75} />
            ) : (
              <Moon className="w-5 h-5" strokeWidth={1.75} />
            )}
          </button>
        )}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-[10px] font-bold">
          {initials}
        </div>
      </div>
    </header>
  );
}
