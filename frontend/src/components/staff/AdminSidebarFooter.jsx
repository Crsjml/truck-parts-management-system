import { User, SignOut } from '@phosphor-icons/react';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/**
 * Staff sidebar footer: the "My account" control (avatar, name, role badge)
 * and an icon-only Sign out button. Both stay reachable when the sidebar is
 * collapsed to icons.
 */
export default function AdminSidebarFooter({
  name,
  roleLabel,
  isSuperadmin = false,
  avatarUrl = null,
  collapsed = false,
  onAccount,
  onLogout,
  nameMaxWidth = 'max-w-[120px]'
}) {
  return (
    <div className={`flex items-center w-full ${collapsed ? 'flex-col justify-center gap-2' : 'justify-between gap-2'}`}>
      <button
        type="button"
        onClick={onAccount}
        aria-label={`My account — ${name}`}
        title="My Account"
        className={`flex items-center rounded-lg text-left hover:opacity-80 transition-opacity ${FOCUS_RING} ${collapsed ? 'justify-center' : 'gap-3 min-w-0'}`}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="w-10 h-10 rounded-full border border-border object-cover bg-secondary shrink-0"
          />
        ) : (
          <span className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-secondary-foreground text-sm font-bold shrink-0">
            <User weight="duotone" className="w-5 h-5" aria-hidden="true" />
          </span>
        )}
        {!collapsed && (
          <span className="flex flex-col text-left overflow-hidden">
            <span className={`text-sm font-semibold text-foreground truncate ${nameMaxWidth}`}>{name}</span>
            <span className="mt-0.5">
              <span className={`text-11px font-bold px-1.5 py-0.5 rounded tracking-wide ${isSuperadmin ? 'bg-primary text-primary-foreground' : 'text-foreground bg-muted'}`}>
                {roleLabel}
              </span>
            </span>
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={onLogout}
        aria-label="Sign out"
        title="Sign out"
        className={`p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0 ${FOCUS_RING}`}
      >
        <SignOut weight="duotone" className="w-5 h-5" aria-hidden="true" />
      </button>
    </div>
  );
}
