import React from 'react';
import {
  RefreshCw,
  SlidersHorizontal,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

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
    subtitle: 'Per-symbol profitability breakdown identifying key profit drivers versus performance draggers.',
  },
  'long-short': {
    title: 'Directional Analysis: Long vs Short',
    subtitle: 'Objective statistical comparison between long and short trades and win-rate asymmetry.',
  },
  behavior: {
    title: 'Trading Behavior & Psychological Flaws',
    subtitle: 'Algorithmic detection of revenge trading, over-sizing, loss chasing, and premature exits.',
  },
  risk: {
    title: 'Risk Management & Capital Health',
    subtitle: 'Transparent 0–100 risk score breakdown, leverage distribution, and max drawdown limits.',
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
    activeTab,
    setIsConnectionModalOpen,
    syncNow,
    isSyncing,
    toggleDemoMode,
  } = useTrading();

  const isDemo = status?.is_demo_mode ?? true;
  const currentInfo = titles[activeTab] || { title: 'Trading Dashboard', subtitle: '' };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10 no-print">
      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-base font-bold text-slate-900 leading-none">
          {currentInfo.title}
        </h1>
        <p className="text-xs text-slate-500 mt-1 hidden sm:block">
          {currentInfo.subtitle}
        </p>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Demo Mode Toggle Switch */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => toggleDemoMode(true)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              isDemo
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Demo Data
          </button>
          <button
            onClick={() => {
              if (!status?.is_connected) {
                setIsConnectionModalOpen(true);
              } else {
                toggleDemoMode(false);
              }
            }}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              !isDemo
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {!isDemo && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
            Live Account
          </button>
        </div>

        {/* Balance & Equity Chip */}
        <div className="hidden md:flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Balance:
            </span>
            <span className="text-xs font-bold text-slate-900 font-mono tabular-nums">
              ${status?.account_balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '10,000.00'}
            </span>
          </div>

          <span className="text-slate-300 font-light">|</span>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Equity:
            </span>
            <span className="text-xs font-bold text-slate-900 font-mono tabular-nums">
              ${(status?.equity ?? ((status?.account_balance ?? 10000) + (status?.unrealized_pnl ?? 0))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {status?.unrealized_pnl !== undefined && status.unrealized_pnl !== 0 && (
              <span className={`text-[10px] font-mono font-medium ${status.unrealized_pnl > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ({status.unrealized_pnl > 0 ? '+' : ''}${status.unrealized_pnl.toFixed(2)})
              </span>
            )}
          </div>
        </div>

        {/* Sync Trigger */}
        <button
          onClick={syncNow}
          disabled={isSyncing}
          title="Synchronize data"
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-slate-800' : ''}`} />
        </button>

        {/* API Credentials button */}
        <button
          onClick={() => setIsConnectionModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-subtle transition"
        >
          <KeyRound className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Binance API</span>
        </button>
      </div>
    </header>
  );
};
