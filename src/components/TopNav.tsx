import { BookOpen, RefreshCw } from 'lucide-react';
import type { MouseEvent } from 'react';
import { getPathFromPortal, type PortalRoute } from '../lib/libraryLogic';

interface TopNavProps {
  activePortal: PortalRoute;
  onNavigate: (portal: PortalRoute) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const NAV_ITEMS: { id: PortalRoute; label: string; href: string }[] = [
  { id: 'student', label: 'Student Portal', href: '/student' },
  { id: 'book', label: 'Book Portal', href: '/book' },
  { id: 'borrowlist', label: 'Borrow List', href: '/borrowlist' },
];

export function TopNav({
  activePortal,
  onNavigate,
  onRefresh,
  isRefreshing,
}: TopNavProps) {
  function handleLinkClick(
    event: MouseEvent<HTMLAnchorElement>,
    portal: PortalRoute,
  ) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }
    event.preventDefault();
    onNavigate(portal);
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-14 sm:h-16 flex items-center justify-between gap-4 sm:gap-8">
          <a
            href={getPathFromPortal('student')}
            onClick={(e) => handleLinkClick(e, 'student')}
            className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 rounded-md px-1 py-0.5"
          >
            <BookOpen
              className="w-5 h-5 text-blue-800 shrink-0"
              aria-hidden="true"
            />
            <span>Athenaeum</span>
          </a>

          <nav
            aria-label="Primary Portals"
            className="hidden sm:flex items-center gap-6"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activePortal === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => handleLinkClick(e, item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative px-3 py-2 text-sm font-medium whitespace-nowrap shrink-0 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ${
                    isActive
                      ? 'text-blue-900 bg-blue-50/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-3 -bottom-[1px] h-0.5 bg-blue-800 rounded-full"
                    />
                  )}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 disabled:opacity-60 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Mobile sub-row navigation (stays <= 15% of 844px mobile viewport) */}
        <nav
          aria-label="Mobile Portals"
          className="sm:hidden grid grid-cols-3 gap-1 pb-2.5 border-t border-slate-100 pt-2"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activePortal === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => handleLinkClick(e, item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`text-center px-2 py-1.5 text-xs font-medium whitespace-nowrap rounded-md transition-colors ${
                  isActive
                    ? 'text-blue-900 bg-blue-50 border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
