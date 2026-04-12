const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'],
  finance: ['dashboard', 'orders', 'cod', 'reports', 'wallet', 'config'],
  support_staff: ['dashboard', 'orders', 'customers', 'support'],
  outlet_manager: ['dashboard', 'orders', 'drivers', 'outlets', 'services'],
  marketing: ['dashboard', 'offers', 'banners', 'notifications'],
};

// Map nav href to section key
const HREF_TO_SECTION: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/dashboard/orders': 'orders',
  '/dashboard/drivers': 'drivers',
  '/dashboard/customers': 'customers',
  '/dashboard/outlets': 'outlets',
  '/dashboard/services': 'services',
  '/dashboard/offers': 'offers',
  '/dashboard/banners': 'banners',
  '/dashboard/notifications': 'notifications',
  '/dashboard/cod': 'cod',
  '/dashboard/reports': 'reports',
  '/dashboard/support': 'support',
  '/dashboard/config': 'config',
};

export function canAccess(adminRole: string | undefined, section: string): boolean {
  if (!adminRole) return true; // No role info = legacy admin, allow all
  const perms = ROLE_PERMISSIONS[adminRole];
  if (!perms) return true; // Unknown role = allow (server enforces)
  return perms.includes('*') || perms.includes(section);
}

export function canAccessHref(adminRole: string | undefined, href: string): boolean {
  const section = HREF_TO_SECTION[href];
  if (!section) return true; // Unknown href = allow
  return canAccess(adminRole, section);
}
