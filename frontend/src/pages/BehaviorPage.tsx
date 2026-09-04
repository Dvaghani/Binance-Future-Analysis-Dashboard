import React, { useEffect, useState, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  Clock,
  TrendingDown,
  Scale,
  Zap,
  Activity,
  ArrowDownRight,
  Search,
  Filter,
  RotateCcw,
  X,
  CheckCircle2,
  AlertCircle,
  Coins,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { BehaviorData, BehaviorItem, FlaggedTrade } from '../types';
import { formatPNL, formatCurrency } from '../utils/format';
import { useTrading } from '../context/TradingContext';

// Behavior metadata configuration for icons, accents, and visual hierarchy
const BEHAVIOR_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    iconBg: string;
    category: string;
  }
> = {
  OVERTRADING: {
    icon: Flame,
    accentColor: 'text-amber-600',
    iconBg: 'bg-amber-100 text-amber-600',
    category: 'Pacing / Frequency',
  },
  REVENGE_TRADING: {
    icon: Zap,
    accentColor: 'text-rose-600',
    iconBg: 'bg-rose-100 text-rose-600',
    category: 'Emotional Bias',
  },
  LOSS_CHASING: {
    icon: TrendingDown,
    accentColor: 'text-red-600',
    iconBg: 'bg-red-100 text-red-600',
    category: 'Leverage Risk',
  },
  OVERSIZED: {
    icon: Scale,
    accentColor: 'text-indigo-600',
    iconBg: 'bg-indigo-100 text-indigo-600',
    category: 'Capital Allocation',
  },
  HELD_LOSER_TOO_LONG: {
    icon: Clock,
    accentColor: 'text-orange-600',
    iconBg: 'bg-orange-100 text-orange-600',
    category: 'Holding Asymmetry',
  },
  CUT_WINNER_EARLY: {
    icon: ArrowDownRight,
    accentColor: 'text-cyan-600',
    iconBg: 'bg-cyan-100 text-cyan-600',
    category: 'Profit Premature Exit',
  },
  STREAK_TILT: {
    icon: AlertTriangle,
    accentColor: 'text-rose-600',
    iconBg: 'bg-rose-100 text-rose-600',
    category: 'Tilt Compounding',
  },
  EUPHORIA_OVERTRADING: {
    icon: Activity,
    accentColor: 'text-purple-600',
    iconBg: 'bg-purple-100 text-purple-600',
    category: 'Greed / Overconfidence',
  },
};

export const BehaviorPage: React.FC = () => {
  const { status } = useTrading();
  const [data, setData] = useState<BehaviorData | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedFlaw, setSelectedFlaw] = useState<string>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');
  const [sideFilter, setSideFilter] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL');
  const [search, setSearch] = useState<string>('');
  const [selectedTrade, setSelectedTrade] = useState<FlaggedTrade | null>(null);

  useEffect(() => {
    loadBehavior();
  }, [status?.is_demo_mode, status?.last_sync_time]);

  const loadBehavior = async () => {
    try {
      setLoading(true);
      const res = await api.getBehavior();
      setData(res);
    } catch (e) {
      console.error('Failed to fetch behavioral data:', e);
    } finally {
      setLoading(false);
    }
  };

  const totalCost = useMemo(() => {
    if (!data) return 0;
    return data.behaviors.reduce((acc, b) => acc + b.cost, 0);
  }, [data]);

  // Filtered timeline trades
  const filteredTrades = useMemo(() => {
    if (!data) return [];
    return data.flagged_trades.filter((t) => {
      // 1. Outcome Filter (Winners / Losers)
      if (outcomeFilter === 'WIN' && t.net_pnl <= 0) return false;
      if (outcomeFilter === 'LOSS' && t.net_pnl > 0) return false;

      // 2. Side Filter
      if (sideFilter !== 'ALL' && t.side !== sideFilter) return false;

      // 3. Flaw Card Filter
      if (selectedFlaw !== 'ALL' && !t.flags.includes(selectedFlaw)) return false;

      // 4. Search Filter (symbol or flag text)
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const symbolMatch = t.symbol.toLowerCase().includes(query);
        const flagMatch = t.flags.some((f) => f.toLowerCase().includes(query));
        if (!symbolMatch && !flagMatch) return false;
      }

      return true;
    });
  }, [data, outcomeFilter, sideFilter, selectedFlaw, search]);

  const isFilterActive =
    selectedFlaw !== 'ALL' || outcomeFilter !== 'ALL' || sideFilter !== 'ALL' || search.trim().length > 0;

  const resetFilters = () => {
    setSelectedFlaw('ALL');
    setOutcomeFilter('ALL');
    setSideFilter('ALL');
    setSearch('');
  };

  // Pre-calculate counts for quick pills
  const { winCount, lossCount } = useMemo(() => {
    if (!data) return { winCount: 0, lossCount: 0 };
    let wins = 0;
    let losses = 0;
    data.flagged_trades.forEach((t) => {
      if (t.net_pnl > 0) wins++;
      else losses++;
    });
    return { winCount: wins, lossCount: losses };
  }, [data]);

  if (loading || !data) {
    return (
      <div className="p-8 animate-pulse space-y-6 max-w-7xl mx-auto">
        <div className="h-32 bg-slate-200/70 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-44 bg-slate-200/50 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-200/50 rounded-xl" />
      </div>
    );
  }

  const activeBehavior = data.behaviors.find((b) => b.key === selectedFlaw);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Overview Banner */}
      <div className="card-white p-5 border-amber-200/80 bg-gradient-to-r from-amber-50/40 via-white to-amber-50/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0 shadow-sm">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Psychological & Execution Flaw Audit
              </h2>
              <span className="text-[10px] font-semibold bg-amber-100/70 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded-full">
                8 Automated Detectors
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Detects overtrading bursts, revenge entries, loss-chasing spikes, position over-sizing, hold-time asymmetry, and premature profit cutting.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
          <div className="bg-white border border-slate-200/80 px-4 py-2 rounded-xl text-right shadow-xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
              Discipline Score
            </span>
            <span className="text-lg font-bold font-mono text-slate-900">
              {data.discipline_score !== undefined ? `${data.discipline_score}/100` : 'Healthy'}
            </span>
          </div>
          <div className="bg-white border border-rose-200 px-4 py-2 rounded-xl text-right shadow-xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
              Cost of Bad Habits
            </span>
            <span className="text-lg font-bold font-mono text-rose-600">
              -${totalCost.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* 8 Behavior Flaw Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 px-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-xs uppercase font-bold text-slate-500 tracking-wider">
              Flaw Detection Matrix
            </h3>
            <span className="text-[11px] text-slate-400">
              (Click any card to filter flagged trades below)
            </span>
          </div>
          {selectedFlaw !== 'ALL' && (
            <button
              onClick={() => setSelectedFlaw('ALL')}
              className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-md transition"
            >
              <RotateCcw className="w-3 h-3" />
              Clear Card Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {data.behaviors.map((b) => {
            const config = BEHAVIOR_CONFIG[b.key] || {
              icon: AlertCircle,
              accentColor: 'text-slate-600',
              iconBg: 'bg-slate-100 text-slate-600',
              category: 'General',
            };
            const Icon = config.icon;
            const isSelected = selectedFlaw === b.key;
            const isCritical = b.count > 3;
            const hasEvents = b.count > 0;

            return (
              <div
                key={b.key}
                onClick={() => setSelectedFlaw(isSelected ? 'ALL' : b.key)}
                className={`group relative card-white p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'ring-2 ring-slate-900 border-transparent shadow-md bg-slate-50/70 translate-y-[-2px]'
                    : isCritical
                    ? 'border-rose-300 hover:border-rose-400 hover:shadow-sm'
                    : hasEvents
                    ? 'border-amber-200/90 hover:border-amber-400 hover:shadow-sm'
                    : 'hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  {/* Top Bar: Icon + Category + Event Badge */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${config.iconBg}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-medium text-slate-400 block">
                        {config.category}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition ${
                        b.count === 0
                          ? 'bg-slate-100 text-slate-500'
                          : isCritical
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {b.count} {b.count === 1 ? 'trade' : 'trades'}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-slate-950">
                      {b.title}
                    </h4>
                    {isSelected && (
                      <span className="text-[9px] font-bold text-white bg-slate-900 px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2 min-h-[34px]">
                    {b.description}
                  </p>
                </div>

                {/* Footer: Cost & Click prompt */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-[10px] uppercase font-semibold">Cost:</span>
                    <span
                      className={`font-mono font-bold text-xs ${
                        b.cost > 0 ? 'text-rose-600' : 'text-slate-500'
                      }`}
                    >
                      {b.cost > 0 ? `-$${b.cost.toFixed(2)}` : '$0.00'}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-medium transition ${
                      isSelected
                        ? 'text-slate-900 font-semibold'
                        : 'text-slate-400 group-hover:text-slate-700'
                    }`}
                  >
                    {isSelected ? 'Click to deselect' : 'Filter →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flagged Execution Timeline Section */}
      <div className="card-white overflow-hidden space-y-0">
        {/* Table Header & Interactive Filters Toolbar */}
        <div className="p-4 border-b border-slate-100 space-y-3.5 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Flagged Execution Timeline
                </h3>
                <span className="text-[11px] font-semibold font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {filteredTrades.length} of {data.total_flagged_count} violations
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Chronological trade executions that triggered behavioral rule breaches
              </p>
            </div>

            {/* Filter Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search symbol or flaw..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white w-48 transition"
              />
            </div>
          </div>

          {/* Quick Filter Pill Controls: Outcome (Winners / Losers) & Directions & Flaws */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              {/* Winner / Loser Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg">
                <button
                  onClick={() => setOutcomeFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                    outcomeFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({data.flagged_trades.length})
                </button>
                <button
                  onClick={() => setOutcomeFilter('WIN')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                    outcomeFilter === 'WIN'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      outcomeFilter === 'WIN' ? 'bg-white' : 'bg-emerald-500'
                    }`}
                  />
                  Winners Only ({winCount})
                </button>
                <button
                  onClick={() => setOutcomeFilter('LOSS')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                    outcomeFilter === 'LOSS'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      outcomeFilter === 'LOSS' ? 'bg-white' : 'bg-rose-500'
                    }`}
                  />
                  Losers Only ({lossCount})
                </button>
              </div>

              {/* Side Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg">
                <button
                  onClick={() => setSideFilter('ALL')}
                  className={`px-2 py-1 rounded-md text-xs font-semibold transition ${
                    sideFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Both Sides
                </button>
                <button
                  onClick={() => setSideFilter('LONG')}
                  className={`px-2 py-1 rounded-md text-xs font-semibold transition ${
                    sideFilter === 'LONG'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Long
                </button>
                <button
                  onClick={() => setSideFilter('SHORT')}
                  className={`px-2 py-1 rounded-md text-xs font-semibold transition ${
                    sideFilter === 'SHORT'
                      ? 'bg-white text-rose-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Short
                </button>
              </div>

              {/* Flaw Selector Dropdown */}
              <select
                value={selectedFlaw}
                onChange={(e) => setSelectedFlaw(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
              >
                <option value="ALL">All Flaw Types (8)</option>
                {data.behaviors.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.title} ({b.count})
                  </option>
                ))}
              </select>

              {isFilterActive && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-900 px-2 py-1 rounded-md hover:bg-slate-100 transition"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>

            {selectedFlaw !== 'ALL' && activeBehavior && (
              <div className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg">
                <span className="font-semibold">Filtering by flaw:</span>
                <span>{activeBehavior.title}</span>
                <button
                  onClick={() => setSelectedFlaw('ALL')}
                  className="hover:text-amber-950 p-0.5 rounded hover:bg-amber-200/60"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Exit Time</th>
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-4">Side</th>
                <th className="py-3 px-4">Size ($)</th>
                <th className="py-3 px-4">Leverage</th>
                <th className="py-3 px-4">Net PNL</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Flaw Detected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center font-sans">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p className="text-sm font-semibold text-slate-700">
                        No flagged trades found
                      </p>
                      <p className="text-xs text-slate-400">
                        {outcomeFilter !== 'ALL'
                          ? `No ${outcomeFilter === 'WIN' ? 'winning' : 'losing'} trades matched the current flaw filter.`
                          : 'Try clearing your active flaw or search filter.'}
                      </p>
                      {isFilterActive && (
                        <button
                          onClick={resetFilters}
                          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 shadow-sm transition"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t) => {
                  const isWin = t.net_pnl > 0;
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTrade(t)}
                      className="hover:bg-slate-50/80 cursor-pointer transition"
                    >
                      <td className="py-3 px-4 font-sans text-slate-500 whitespace-nowrap">
                        {t.exit_time}
                      </td>
                      <td className="py-3 px-4 font-sans font-bold text-slate-900 whitespace-nowrap">
                        {t.symbol}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            t.side === 'LONG'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                          }`}
                        >
                          {t.side}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        ${t.position_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{t.leverage}x</td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-bold inline-flex items-center gap-1 ${
                            isWin ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isWin ? '+' : ''}${t.net_pnl.toFixed(2)}
                          <span
                            className={`text-[9px] font-sans font-semibold px-1 py-0.2 rounded ${
                              isWin
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {isWin ? 'WIN' : 'LOSS'}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-500">
                        {t.duration_mins} mins
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <div className="flex flex-wrap gap-1">
                          {t.flags.map((f, idx) => (
                            <span
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFlaw(f);
                              }}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded cursor-pointer transition ${
                                selectedFlaw === f
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                              }`}
                            >
                              {f.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trade Detail Modal */}
      {selectedTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    selectedTrade.side === 'LONG'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {selectedTrade.side === 'LONG' ? 'L' : 'S'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {selectedTrade.symbol} {selectedTrade.side} Trade
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">ID: {selectedTrade.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTrade(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Outcome Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Net PNL
                  </span>
                  <div
                    className={`text-xl font-bold font-mono ${
                      selectedTrade.net_pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {selectedTrade.net_pnl >= 0 ? '+' : ''}${selectedTrade.net_pnl.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Result
                  </span>
                  <span
                    className={`inline-block mt-0.5 text-xs font-bold px-2 py-0.5 rounded ${
                      selectedTrade.net_pnl > 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {selectedTrade.net_pnl > 0 ? 'WINNER' : 'LOSER'}
                  </span>
                </div>
              </div>

              {/* Trade Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-sans text-slate-400 block">Position Size</span>
                  <span className="font-semibold text-slate-800">
                    ${selectedTrade.position_value.toLocaleString()}
                  </span>
                </div>
                <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-sans text-slate-400 block">Leverage</span>
                  <span className="font-semibold text-slate-800">{selectedTrade.leverage}x</span>
                </div>
                <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-sans text-slate-400 block">Hold Duration</span>
                  <span className="font-semibold text-slate-800">
                    {selectedTrade.duration_mins} mins
                  </span>
                </div>
                <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-sans text-slate-400 block">Exit Time</span>
                  <span className="font-semibold text-slate-800 font-sans text-[11px]">
                    {selectedTrade.exit_time}
                  </span>
                </div>
              </div>

              {/* Triggered Flaws */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-amber-900 font-semibold text-xs">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                  Violated Rules Detected
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTrade.flags.map((flag, idx) => (
                    <span
                      key={idx}
                      className="bg-white text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[10px] font-semibold"
                    >
                      {flag.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setSelectedTrade(null)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition"
              >
                Close Trade Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
