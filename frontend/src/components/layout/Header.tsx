import React, { useState, useRef, useEffect } from 'react';
import {
  RefreshCw,
  KeyRound,
  ChevronDown,
  Check,
  Plus,
  Layers,
  Wallet,
  Settings,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { ThemeToggle } from '../common/ThemeToggle';

const titles: Record<string, { title: string; subtitle: string }> = {
  overview: {
    title: 'Executive Trading Dashboard',
    subtitle: 'High-level trading performance, win ratios, trajectory, and recent execution health.',
  },
  performance: {
    title: 'Equity & Drawdown Analytics',
    subtitle: 'Interactive multi-timeframe equity curves, underwater drawdown analysis, and period comparisons.',
  },
  trades: {
    title: 'Trade Journal & Execution Log',
    subtitle: 'Complete searchable trade table with fee itemization, durations, and behavioral tags.',
  },
  assets: {
    title: 'Asset & Coin Performance',
    subtitle: 'Individual symbol profitability, win rates, and volume contribution.',
  },
  'long-short': {
    title: 'Long vs Short Bias Analysis',
    subtitle: 'Directional asymmetry, profit factors, and win rates by execution side.',
  },
  'time-analysis': {
    title: 'Temporal Trading Patterns',
    subtitle: 'Performance distribution broken down by hour of day and weekday session.',
  },
  behavior: {
    title: 'Behavioral Diagnostics',
    subtitle: 'Tilt warnings, holding time decay, and position size risk discipline metrics.',
  },
  risk: {
    title: 'Risk & Ruin Analytics',
    subtitle: 'Drawdown depths, VaR modeling, Sharpe ratio, and margin stress scenarios.',
  },
  market: {
    title: 'Market Regime Context',
    subtitle: 'Strategy fit across trending bull, sideways chop, bear corrections, and volatile periods.',
  },
  calendar: {
    title: 'Trading Calendar Heatmap',
    subtitle: 'Day-by-day PNL distribution and daily win rate drill-downs.',
  },
  reports: {
    title: '13-Section Audit Report',
    subtitle: 'Comprehensive executive performance audit ready for review and high-resolution PDF export.',
  },
};

export const Header: React.FC = () => {
  const {
    status,
    accounts,
    activeAccountId,
    activeAccountName,
    activeTab,
    openConnectionModal,
    syncNow,
    switchAccount,
    isSyncing,
    toggleDemoMode,
    lookbackDays,
    setLookbackDays,
    setIsSyncGuideOpen,
  } = useTrading();

  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDemo = status?.is_demo_mode ?? true;
  const currentInfo = titles[activeTab] || { title: 'Trading Dashboard', subtitle: '' };

  const handleSelectAccount = (id: number) => {
    switchAccount(id);
    setIsAccountDropdownOpen(false);
  };

  return (
    <header className="h-16 bg-white dark:bg-[#0B0F17] border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 no-print transition-colors duration-200">
      {/* Page Title & Subtitle */}
      <div className="min-w-0 flex-1 pr-4">
        <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight truncate">
          {currentInfo.title}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate hidden md:block">
          {currentInfo.subtitle}
        </p>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Demo / Live Toggle */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/80">
          <button
            onClick={() => toggleDemoMode(true)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              isDemo
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-600/80 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Demo Data
          </button>
          <button
            onClick={() => {
              if (accounts.length === 0 && !status?.is_connected) {
                openConnectionModal('connect');
              } else {
                toggleDemoMode(false);
              }
            }}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              !isDemo
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-xs border border-slate-200/80 dark:border-slate-600/80 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {!isDemo && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
            Live Account
          </button>
        </div>

        {/* Multi-Account Selector Dropdown (Shown in Live Mode) */}
        {!isDemo && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsAccountDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700/80 rounded-lg shadow-xs transition"
              title="Switch Binance Account"
            >
              {activeAccountId === 0 ? (
                <Layers className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
              ) : (
                <Wallet className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
              )}
              <span className="max-w-[120px] sm:max-w-[150px] truncate font-medium">
                {activeAccountId === 0 ? 'All Live Accounts' : activeAccountName}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isAccountDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isAccountDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-[#131B2A] border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                      Binance Accounts
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {accounts.length} connected profile{accounts.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsAccountDropdownOpen(false);
                      openConnectionModal('connect');
                    }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                </div>

                {/* All Accounts Combined Option */}
                {accounts.length > 1 && (
                  <div className="p-1 border-b border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleSelectAccount(0)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition ${
                        activeAccountId === 0
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
                          <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="text-left min-w-0">
                          <div className="font-semibold truncate">All Live Accounts</div>
                          <div className="text-[10px] text-slate-400 truncate">
                            Aggregated metrics ({accounts.length} accounts)
                          </div>
                        </div>
                      </div>
                      {activeAccountId === 0 && (
                        <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />
                      )}
                    </button>
                  </div>
                )}

                {/* Individual Account List */}
                <div className="p-1 max-h-56 overflow-y-auto space-y-0.5">
                  {accounts.map((acc) => {
                    const isActive = activeAccountId === acc.id;
                    return (
                      <button
                        key={acc.id}
                        onClick={() => handleSelectAccount(acc.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition ${
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <Wallet className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-500' : 'text-slate-400'}`} />
                          </div>
                          <div className="text-left min-w-0">
                            <div className="font-medium truncate flex items-center gap-1.5">
                              <span>{acc.name}</span>
                              {acc.is_connected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              ${acc.account_balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} &bull; {acc.api_key_masked}
                            </div>
                          </div>
                        </div>
                        {isActive && (
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Footer Actions */}
                <div className="p-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1">
                  <button
                    onClick={() => {
                      setIsAccountDropdownOpen(false);
                      openConnectionModal('accounts');
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Manage Accounts</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsAccountDropdownOpen(false);
                      openConnectionModal('connect');
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-md transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Connect New</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Theme Mode Toggle */}
        <ThemeToggle />

        {/* Balance & Equity Chip */}
        <div className="hidden xl:flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 px-3 py-1.5 rounded-lg">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              {activeAccountId === 0 && !isDemo ? 'Total Bal:' : 'Balance:'}
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
              ${status?.account_balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '10,000.00'}
            </span>
          </div>

          <span className="text-slate-300 dark:text-slate-600 font-light">|</span>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              Equity:
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
              ${(status?.equity ?? ((status?.account_balance ?? 10000) + (status?.unrealized_pnl ?? 0))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {status?.unrealized_pnl !== undefined && status.unrealized_pnl !== 0 && (
              <span className={`text-[10px] font-mono font-medium ${status.unrealized_pnl > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                ({status.unrealized_pnl > 0 ? '+' : ''}${status.unrealized_pnl.toFixed(2)})
              </span>
            )}
          </div>
        </div>

        {/* Sync Controls & Period Selector */}
        <div className="flex items-center bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5">
          {!isDemo && (
            <select
              value={lookbackDays}
              onChange={(e) => setLookbackDays(Number(e.target.value))}
              title="Select Historical Lookback Period"
              className="px-2 py-1 text-xs font-semibold bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none border-r border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <option value={7} className="bg-white dark:bg-slate-800">7D (Fast)</option>
              <option value={30} className="bg-white dark:bg-slate-800">30D (Default)</option>
              <option value={60} className="bg-white dark:bg-slate-800">60D</option>
              <option value={90} className="bg-white dark:bg-slate-800">90D (Max API)</option>
            </select>
          )}

          <button
            onClick={() => syncNow(lookbackDays)}
            disabled={isSyncing}
            title={
              isDemo
                ? 'Refresh 90-day demo simulation'
                : activeAccountId === 0
                ? `Sync all live accounts (${lookbackDays}D history)`
                : `Synchronize ${activeAccountName} (${lookbackDays}D history)`
            }
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition disabled:opacity-50 flex items-center gap-1 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
            <span className="hidden lg:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>

        {/* Sync & History Guide Button */}
        <button
          onClick={() => setIsSyncGuideOpen(true)}
          title="Binance Sync & Historical Data Guide"
          className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700/80 transition flex items-center gap-1"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="hidden xl:inline text-xs font-semibold">Guide</span>
        </button>

        {/* Accounts / API Management button */}
        <button
          onClick={() => openConnectionModal(accounts.length > 0 ? 'accounts' : 'connect')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/80 rounded-lg shadow-subtle transition"
        >
          <KeyRound className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="hidden sm:inline">
            {accounts.length > 1 ? `Accounts (${accounts.length})` : 'Binance API'}
          </span>
        </button>
      </div>
    </header>
  );
};
