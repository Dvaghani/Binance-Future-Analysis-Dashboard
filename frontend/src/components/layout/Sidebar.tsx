import React from 'react';
import {
  LayoutDashboard,
  LineChart,
  History,
  Coins,
  ArrowLeftRight,
  Clock,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Calendar,
  FileText,
  RefreshCw,
  KeyRound,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { ThemeToggle } from '../common/ThemeToggle';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'performance', label: 'Performance', icon: LineChart },
  { id: 'trades', label: 'Trade Journal', icon: History },
  { id: 'assets', label: 'Asset Breakdown', icon: Coins },
  { id: 'long-short', label: 'Long vs Short', icon: ArrowLeftRight },
  { id: 'time-analysis', label: 'Time Analysis', icon: Clock },
  { id: 'behavior', label: 'Trading Behavior', icon: ShieldAlert, badge: '8 Rules' },
  { id: 'risk', label: 'Risk & Drawdown', icon: ShieldCheck },
  { id: 'market', label: 'Market Context', icon: TrendingUp },
  { id: 'calendar', label: 'Trading Calendar', icon: Calendar },
  { id: 'reports', label: 'Audit Reports', icon: FileText, badge: 'PDF' },
];

export const Sidebar: React.FC = () => {
  const {
    status,
    activeTab,
    setActiveTab,
    setIsConnectionModalOpen,
    syncNow,
    isSyncing,
  } = useTrading();

  const isDemo = status?.is_demo_mode ?? true;

  const formatLastSync = (isoString?: string | null) => {
    if (!isoString) return 'Not synced yet';
    try {
      // Ensure ISO string is parsed as UTC even if no offset is present
      const normalized = isoString.endsWith('Z') || isoString.includes('+')
        ? isoString
        : `${isoString}Z`;
      const date = new Date(normalized);
      const diffSecs = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
      if (diffSecs < 45) return 'Just now';
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins === 1) return '1 min ago';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours === 1) return '1h ago';
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <aside className="w-64 bg-white dark:bg-[#0B0F17] border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between h-screen sticky top-0 select-none z-20 no-print transition-colors duration-200">
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center px-5 border-b border-slate-100 dark:border-slate-800/80 gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 dark:bg-emerald-950/80 dark:border dark:border-emerald-500/40 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-4 h-4 text-white dark:text-emerald-400" />
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-white block leading-tight">
              Binance Futures
            </span>
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Trading Intelligence
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-0.5">
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Analytics & Execution
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-slate-800/90 text-emerald-900 dark:text-emerald-400 border border-emerald-200/80 dark:border-slate-700/60 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-emerald-100 dark:bg-slate-700 text-emerald-800 dark:text-slate-200'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border dark:border-slate-700/60'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Binance Connection Status & Theme Toggle */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40">
        <div className="p-3 rounded-lg bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-subtle mb-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isDemo
                    ? 'bg-amber-500 animate-pulse'
                    : status?.is_connected
                    ? 'bg-emerald-500'
                    : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
              {isDemo ? 'Demo Mode' : status?.is_connected ? 'Binance Live' : 'Disconnected'}
            </span>
            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-medium">
              READ-ONLY
            </span>
          </div>

          <div className="text-[10px] text-slate-600 dark:text-slate-400 mb-2.5 font-medium flex items-center justify-between">
            <span>Last sync:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{formatLastSync(status?.last_sync_time)}</span>
          </div>

          <button
            onClick={syncNow}
            disabled={isSyncing}
            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border dark:border-slate-700/50 text-xs font-medium rounded transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>

        {/* API Settings Button */}
        <button
          onClick={() => setIsConnectionModalOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/80 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700/80 transition mb-2"
        >
          <div className="flex items-center gap-2">
            <KeyRound className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span>Binance API Keys</span>
          </div>
          {status?.is_connected && !isDemo && (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          )}
        </button>

        {/* Compact Theme Switcher row in sidebar */}
        <div className="flex items-center justify-between px-3 py-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="text-[11px] font-medium">Appearance</span>
          <ThemeToggle compact />
        </div>
      </div>
    </aside>
  );
};
