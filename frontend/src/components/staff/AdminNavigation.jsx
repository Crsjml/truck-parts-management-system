import { SquaresFour, Package, ShoppingCart, ChartBar, Tag, Buildings, UsersThree, ShieldCheck, Gear } from '@phosphor-icons/react';
import { canAccessPage } from '../../utils/staffAccess';

const PAGES = [
  ['dashboard', 'Dashboard Overview', SquaresFour],
  ['catalog', 'Parts Inventory', Package],
  ['pos', 'Sales POS Entry', ShoppingCart],
  ['analytics', 'Sales Analytics', ChartBar],
  ['categories', 'Category Management', Tag],
  ['purchasing', 'Purchasing', Buildings],
  ['customers', 'Customer Management', UsersThree],
  ['staff', 'Staff Management', ShieldCheck],
  ['settings', 'System Settings', Gear]
];

export default function AdminNavigation({ role, page, collapsed = false, onNavigate, onSettings }) {
  return (
    <nav className="space-y-1" aria-label="Admin navigation">
      {PAGES.filter(([id]) => canAccessPage(role, id)).map(([id, label, Icon]) => (
        <button
          key={id}
          title={label}
          aria-label={label}
          aria-current={page === id ? 'page' : undefined}
          onClick={() => id === 'settings' ? onSettings() : onNavigate(id)}
          className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3.5 px-4'} py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${page === id
            ? 'bg-accent/15 text-accent border border-accent/20'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'}`}
        >
          <Icon weight="duotone" className="w-5 h-5 shrink-0" />
          {!collapsed && <span>{label}</span>}
        </button>
      ))}
    </nav>
  );
}
