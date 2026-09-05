import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Clock,
  Coins,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
  LineChart,
  LayoutGrid,
  List,
  Wallet,
} from 'lucide-react';
import { api } from '../services/api';
import { TradeItem } from '../types';
import { formatFee, formatPNL, formatCurrency } from '../utils/format';
import { useTrading } from '../context/TradingContext';
import { TradeChartModal } from '../components/modals/TradeChartModal';

export const TradesPage: React.FC = () => {
  const { status, accounts, activeAccountId } = useTrading();
  const [trades, setTrades] = useState<TradeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [symbol, setSymbol] = useState('ALL');
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [side, setSide] = useState('ALL');
  const [outcome, setOutcome] = useState('ALL');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<number | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<TradeItem | null>(null);
  const [chartTradeId, setChartTradeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedTrade) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedTrade]);

  // Load available traded symbols
  useEffect(() => {
    const loadSymbols = async () => {
      try {
        const res = await api.getTradedSymbols();
        if (res.symbols && res.symbols.length > 0) {
          setAvailableSymbols(res.symbols);
        }
      } catch (err) {
        console.warn('Failed to load traded symbols:', err);
      }
    };
    loadSymbols();
  }, [status?.is_demo_mode, status?.last_sync_time]);

  useEffect(() => {
    loadTrades();
  }, [
    page,
    symbol,
    side,
    outcome,
    selectedAccountFilter,
    search,
    status?.is_demo_mode,
    status?.last_sync_time,
    activeAccountId,
  ]);

  const loadTrades = async () => {
    setLoading(true);
    try {
      // Determine account_id filter:
      // If user specifically picked an account in dropdown, use it.
      // Otherwise, if global activeAccountId is > 0, use activeAccountId.
      const resolvedAccountId: number | undefined =
        selectedAccountFilter !== 'ALL'
          ? selectedAccountFilter
          : (activeAccountId && activeAccountId > 0)
          ? activeAccountId
          : undefined;

      const res = await api.getTrades({
        symbol: symbol === 'ALL' ? undefined : symbol,
        side: side === 'ALL' ? undefined : side,
        outcome: outcome === 'ALL' ? undefined : outcome,
        search: search.trim() || undefined,
        account_id: status?.is_demo_mode ? undefined : resolvedAccountId,
        page,
        page_size: pageSize,
      });
      setTrades(res.trades);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setSymbol('ALL');
    setSide('ALL');
    setOutcome('ALL');
    setSelectedAccountFilter('ALL');
    setPage(1);
  };

  const isFilterActive =
    symbol !== 'ALL' ||
    side !== 'ALL' ||
    outcome !== 'ALL' ||
    selectedAccountFilter !== 'ALL' ||
    search.trim().length > 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Filter and Search Bar */}
      <div className="card-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search symbol, notes, flags..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 focus:bg-white dark:focus:bg-slate-800 w-52 transition"
              />
            </div>

            {/* Symbol Filter */}
            <select
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400"
            >
              <option value="ALL">All Symbols ({availableSymbols.length || 'All'})</option>
              {availableSymbols.length > 0 ? (
                availableSymbols.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))
              ) : (
                <>
                  <option value="BTCUSDT">BTCUSDT</option>
                  <option value="ETHUSDT">ETHUSDT</option>
                  <option value="SOLUSDT">SOLUSDT</option>
                  <option value="BNBUSDT">BNBUSDT</option>
                  <option value="DOGEUSDT">DOGEUSDT</option>
                </>
              )}
            </select>

            {/* Side Filter */}
            <select
              value={side}
              onChange={(e) => {
                setSide(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400"
            >
              <option value="ALL">All Directions</option>
              <option value="LONG">Long Only</option>
              <option value="SHORT">Short Only</option>
            </select>

            {/* Outcome Select Dropdown */}
            <select
              value={outcome}
              onChange={(e) => {
                setOutcome(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400"
            >
              <option value="ALL">All Results</option>
              <option value="WIN">Winners Only</option>
              <option value="LOSS">Losers Only</option>
            </select>

            {/* Account Filter (Live Mode) */}
            {!status?.is_demo_mode && accounts.length > 0 && (
              <select
                value={selectedAccountFilter}
                onChange={(e) => {
                  setSelectedAccountFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value));
                  setPage(1);
                }}
                className="text-xs bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 font-medium"
              >
                <option value="ALL">All Accounts ({accounts.length})</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            )}

            {isFilterActive && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          <div className="text-xs text-slate-400 dark:text-slate-400 font-medium">
            Showing <span className="text-slate-800 dark:text-slate-200 font-semibold">{trades.length}</span> of{' '}
            <span className="text-slate-800 dark:text-slate-200 font-semibold">{total}</span> trades
          </div>
        </div>

        {/* Quick Filter Pills & View Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mr-1 uppercase tracking-wider">Outcome:</span>
            <button
              onClick={() => {
                setOutcome('ALL');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                outcome === 'ALL'
                  ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-700'
              }`}
            >
              All Trades
            </button>
            <button
              onClick={() => {
                setOutcome('WIN');
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                outcome === 'WIN'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${outcome === 'WIN' ? 'bg-white' : 'bg-emerald-500'}`} />
              Winners Only
            </button>
            <button
              onClick={() => {
                setOutcome('LOSS');
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                outcome === 'LOSS'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60 hover:bg-rose-100/70 dark:hover:bg-rose-900/50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${outcome === 'LOSS' ? 'bg-white' : 'bg-rose-500'}`} />
              Losers Only
            </button>
          </div>

          {/* Table / Cards View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Cards View
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Table View
            </button>
          </div>
        </div>
      </div>

      {/* Main Trades Content: Cards View OR Table View */}
      {viewMode === 'cards' ? (
        /* CARDS VIEW */
        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card-white p-5 space-y-4 animate-pulse">
                  <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                  <div className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-8 bg-slate-100 dark:bg-slate-800/60 rounded" />
                    <div className="h-8 bg-slate-100 dark:bg-slate-800/60 rounded" />
                  </div>
                  <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          ) : trades.length === 0 ? (
            <div className="card-white p-14 text-center font-sans">
              <div className="max-w-xs mx-auto space-y-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No trades match criteria</p>
                <p className="text-xs text-slate-400 dark:text-slate-400">
                  {outcome !== 'ALL'
                    ? `No ${outcome === 'WIN' ? 'winning' : 'losing'} trades found with current filters.`
                    : 'Try changing your search query, direction, or symbol filter.'}
                </p>
                {isFilterActive && (
                  <button
                    onClick={resetFilters}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 dark:bg-slate-800 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-700 shadow-sm transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset All Filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trades.map((trade) => {
                const isWin = trade.net_pnl > 0;
                const isLong = trade.side === 'LONG';

                return (
                  <div
                    key={trade.id}
                    onClick={() => setSelectedTrade(trade)}
                    className="card-white p-4.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between cursor-pointer space-y-3 group shadow-xs hover:shadow-md"
                  >
                    {/* Top Row: Symbol, Side Pill, Result Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isLong
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400'
                              : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {isLong ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-slate-900 dark:text-white font-sans">
                              {trade.symbol}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-sans ${
                                isLong
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60'
                              }`}
                            >
                              {trade.side} {trade.leverage}x
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-slate-400 font-sans block">{trade.exit_time}</span>
                            {trade.account_name && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                                {trade.account_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-sans ${
                          isWin
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        {isWin ? 'WIN' : 'LOSS'}
                      </span>
                    </div>

                    {/* Financial Outcome Pill */}
                    <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800/80 flex items-center justify-between font-mono">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Net PnL</span>
                        <span
                          className={`text-lg font-bold ${
                            isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {formatPNL(trade.net_pnl, 2)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Return</span>
                        <span
                          className={`text-sm font-bold ${
                            isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isWin ? '+' : ''}{trade.pnl_percentage.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    {/* Execution Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2 rounded bg-slate-50/40 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Entry Price</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          ${trade.entry_price.toLocaleString()}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-slate-50/40 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Exit Price</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          ${trade.exit_price.toLocaleString()}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-slate-50/40 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Position Value</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          ${trade.position_value.toLocaleString()}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-slate-50/40 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Duration</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 font-sans">
                          {trade.duration_formatted}
                        </span>
                      </div>
                    </div>

                    {/* Itemized Fees & Funding */}
                    <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="text-rose-600 dark:text-rose-400 font-medium">
                        Fee: -{formatFee(trade.commission)}
                      </span>
                      <span
                        className={
                          trade.funding_fees >= 0
                            ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                            : 'text-slate-400'
                        }
                      >
                        Funding: {trade.funding_fees >= 0 ? '+' : ''}{formatFee(trade.funding_fees)}
                      </span>
                    </div>

                    {/* Behavioral Flag Badge if any */}
                    {trade.behavioral_flags.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-2 py-1 rounded">
                        <ShieldAlert className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="font-medium truncate">
                          {trade.behavioral_flags.join(', ').replace(/_/g, ' ')}
                        </span>
                      </div>
                    )}

                    {/* Card Actions: Primary "View on Chart" + Secondary "Details" */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setChartTradeId(trade.id);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg text-xs font-bold transition shadow-xs"
                      >
                        <LineChart className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>View on Chart</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTrade(trade);
                        }}
                        className="px-3 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold transition"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Cards Pagination Footer */}
          <div className="card-white px-5 py-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Page <span className="font-semibold text-slate-800 dark:text-slate-200">{page}</span> of{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{totalPages}</span>
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="card-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Date / Time</th>
                  <th className="py-3 px-3">Symbol</th>
                  <th className="py-3 px-3">Side</th>
                  <th className="py-3 px-3">Entry</th>
                  <th className="py-3 px-3">Exit</th>
                  <th className="py-3 px-3">Size ($)</th>
                  <th className="py-3 px-3">Leverage</th>
                  <th className="py-3 px-3">Net PNL</th>
                  <th className="py-3 px-3">Fee / Funding</th>
                  <th className="py-3 px-3">PNL %</th>
                  <th className="py-3 px-3">Duration</th>
                  <th className="py-3 px-3">Result</th>
                  <th className="py-3 px-3">Flags</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={14} className="py-3.5 px-4">
                        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                      </td>
                    </tr>
                  ))
                ) : trades.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-14 text-center font-sans">
                      <div className="max-w-xs mx-auto space-y-2">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No trades match criteria</p>
                        <p className="text-xs text-slate-400 dark:text-slate-400">
                          {outcome !== 'ALL'
                            ? `No ${outcome === 'WIN' ? 'winning' : 'losing'} trades found with the current filters.`
                            : 'Try changing your search query, direction, or symbol filter.'}
                        </p>
                        {isFilterActive && (
                          <button
                            onClick={resetFilters}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 dark:bg-slate-800 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-700 shadow-sm transition"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Reset All Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  trades.map((trade) => {
                    const isWin = trade.net_pnl > 0;
                    const isLong = trade.side === 'LONG';

                    return (
                      <tr
                        key={trade.id}
                        onClick={() => setSelectedTrade(trade)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition"
                      >
                        <td className="py-3 px-4 font-sans text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {trade.exit_time}
                        </td>
                        <td className="py-3 px-4 font-sans font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{trade.symbol}</span>
                            {trade.account_name && (
                              <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50 font-sans">
                                {trade.account_name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded font-sans inline-flex items-center gap-0.5 ${
                              isLong
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60'
                            }`}
                          >
                            {isLong ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {trade.side}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 tabular-nums">
                          ${trade.entry_price.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 tabular-nums">
                          ${trade.exit_price.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 tabular-nums">
                          ${trade.position_value.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{trade.leverage}x</td>
                        <td
                          className={`py-3 px-3 font-bold tabular-nums ${
                            isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {formatPNL(trade.net_pnl, 2)}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] whitespace-nowrap leading-tight">
                          <div className="text-rose-600 dark:text-rose-400 font-semibold">
                            Fee: -{formatFee(trade.commission)}
                          </div>
                          <div
                            className={
                              trade.funding_fees >= 0
                                ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                                : 'text-slate-500 dark:text-slate-400'
                            }
                          >
                            Fund: {trade.funding_fees >= 0 ? '+' : ''}{formatFee(trade.funding_fees)}
                          </div>
                        </td>
                        <td
                          className={`py-3 px-3 tabular-nums ${
                            isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isWin ? '+' : ''}{trade.pnl_percentage.toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-sans text-[11px] whitespace-nowrap">
                          {trade.duration_formatted}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-sans">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              isWin
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                            }`}
                          >
                            {isWin ? 'WIN' : 'LOSS'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans whitespace-nowrap">
                          {trade.behavioral_flags.length > 0 ? (
                            <span className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 px-1.5 py-0.5 rounded font-medium">
                              {trade.behavioral_flags[0].replace('_', ' ')}
                              {trade.behavioral_flags.length > 1 && ` +${trade.behavioral_flags.length - 1}`}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap font-sans" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setChartTradeId(trade.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition shadow-xs"
                            title="View trade on chart"
                          >
                            <LineChart className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            Chart
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Page <span className="font-semibold text-slate-800 dark:text-slate-200">{page}</span> of{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{totalPages}</span>
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trade Detail Modal / Slide-over */}
      {selectedTrade &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
            onClick={() => setSelectedTrade(null)}
          >
            <div
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-900 dark:text-slate-100 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      selectedTrade.side === 'LONG'
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400'
                        : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {selectedTrade.side === 'LONG' ? 'L' : 'S'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {selectedTrade.symbol} {selectedTrade.side} Trade
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[11px] text-slate-400 dark:text-slate-400 font-mono">ID: {selectedTrade.id}</p>
                      {selectedTrade.account_name && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 font-sans">
                          {selectedTrade.account_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setChartTradeId(selectedTrade.id);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
                  >
                    <LineChart className="w-3.5 h-3.5" />
                    View on Chart
                  </button>
                  <button
                    onClick={() => setSelectedTrade(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4 text-xs">
                {/* Financial Outcome Card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-400 block">
                      Net PNL
                    </span>
                    <div
                      className={`text-xl font-bold font-mono ${
                        selectedTrade.net_pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatPNL(selectedTrade.net_pnl, 2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-400 block">
                      Return on Margin
                    </span>
                    <div
                      className={`text-base font-bold font-mono ${
                        selectedTrade.pnl_percentage >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {selectedTrade.pnl_percentage >= 0 ? '+' : ''}{selectedTrade.pnl_percentage.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* View on Chart Primary Action Button */}
                <button
                  type="button"
                  onClick={() => setChartTradeId(selectedTrade.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold text-xs transition border border-slate-700/60 shadow-sm"
                >
                  <LineChart className="w-4 h-4 text-emerald-400" />
                  <span>View Trade on Candlestick Chart</span>
                </button>

                {/* Price & Execution Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-800/30">
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium block">Entry Price</span>
                    <div className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                      ${selectedTrade.entry_price.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5 block">{selectedTrade.entry_time}</span>
                  </div>

                  <div className="p-3 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-800/30">
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium block">Exit Price</span>
                    <div className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                      ${selectedTrade.exit_price.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5 block">{selectedTrade.exit_time}</span>
                  </div>
                </div>

                {/* Sizing & Itemized Cost Breakdown */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2 bg-white dark:bg-slate-800/60">
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Itemized Cost Breakdown
                  </span>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Gross PnL:</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {formatPNL(selectedTrade.gross_pnl, 2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Trading Commission (Fees):</span>
                    <span className="font-mono text-rose-600 dark:text-rose-400 font-semibold">
                      -{formatFee(selectedTrade.commission)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Funding Fees:</span>
                    <span className={`font-mono font-semibold ${selectedTrade.funding_fees >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>
                      {selectedTrade.funding_fees >= 0 ? '+' : ''}{formatFee(selectedTrade.funding_fees)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between font-bold text-slate-900 dark:text-white">
                    <span>Net Realized PnL:</span>
                    <span className="font-mono">
                      {formatPNL(selectedTrade.net_pnl, 2)}
                    </span>
                  </div>
                </div>

                {/* Flags & Notes */}
                {selectedTrade.behavioral_flags.length > 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-amber-900 dark:text-amber-300 block">Behavioral Flaw Flagged</span>
                      <p className="text-amber-800 dark:text-amber-300 text-[11px] mt-0.5">
                        {selectedTrade.behavioral_flags.join(', ').replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Trade Candlestick Chart Modal */}
      <TradeChartModal tradeId={chartTradeId} onClose={() => setChartTradeId(null)} />
    </div>
  );
};
