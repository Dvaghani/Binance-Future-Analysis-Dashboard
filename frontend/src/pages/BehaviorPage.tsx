import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  ArrowUp,
  ArrowDown,
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
    if (selectedTrade) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedTrade]);

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

  const timelineRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  const handleFlawCardClick = (key: string) => {
    const next = selectedFlaw === key ? 'ALL' : key;
    setSelectedFlaw(next);
    if (next !== 'ALL') {
      // Smoothly scroll down to the timeline table
      setTimeout(() => {
        timelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  };

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
      <div className="card-white p-5 border-amber-200/80 dark:border-amber-900/60 bg-gradient-to-r from-amber-50/40 dark:from-amber-950/20 via-white dark:via-slate-900 to-amber-50/20 dark:to-amber-950/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-100/80 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-sm border dark:border-amber-800/60">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Psychological & Execution Flaw Audit
              </h2>
              <span className="text-[10px] font-semibold bg-amber-100/70 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 px-2 py-0.5 rounded-full">
                8 Automated Detectors
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Detects overtrading bursts, revenge entries, loss-chasing spikes, position over-sizing, hold-time asymmetry, and premature profit cutting.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
          <div className="bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 px-4 py-2 rounded-xl text-right shadow-xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-400 block tracking-wider">
              Discipline Score
            </span>
            <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
              {data.discipline_score !== undefined ? `${data.discipline_score}/100` : 'Healthy'}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-800/80 border border-rose-200 dark:border-rose-900/60 px-4 py-2 rounded-xl text-right shadow-xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-400 block tracking-wider">
              Cost of Bad Habits
            </span>
            <span className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
              -${totalCost.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* 8 Behavior Flaw Cards Grid */}
      <div ref={cardsRef} className="scroll-mt-20">
        <div className="flex items-center justify-between mb-3 px-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-xs uppercase font-bold text-slate-500 tracking-wider">
              Flaw Detection Matrix
            </h3>
            <span className="text-[11px] text-slate-400">
              (Click any card to auto-scroll & filter flagged trades below)
            </span>
          </div>
          {selectedFlaw !== 'ALL' && (
            <button
              onClick={() => setSelectedFlaw('ALL')}
              className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 px-2.5 py-0.5 rounded-md transition"
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
                onClick={() => handleFlawCardClick(b.key)}
                className={`group relative card-white p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'ring-2 ring-emerald-500 border-emerald-400 dark:border-emerald-500/80 shadow-md bg-emerald-50/60 dark:bg-slate-800/90 translate-y-[-2px]'
                    : isCritical
                    ? 'border-rose-300 dark:border-rose-900/80 hover:border-rose-400 dark:hover:border-rose-700 hover:shadow-sm'
                    : hasEvents
                    ? 'border-amber-200/90 dark:border-amber-900/80 hover:border-amber-400 dark:hover:border-amber-700 hover:shadow-sm'
                    : 'hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
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
                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400 block">
                        {config.category}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition ${
                        b.count === 0
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          : isCritical
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                      }`}
                    >
                      {b.count} {b.count === 1 ? 'trade' : 'trades'}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                      {b.title}
                    </h4>
                    {isSelected && (
                      <span className="text-[9px] font-bold text-white bg-emerald-600 px-1.5 py-0.5 rounded shadow-xs">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2 min-h-[34px]">
                    {b.description}
                  </p>
                </div>

                {/* Footer: Cost & Click prompt */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 dark:text-slate-400 text-[10px] uppercase font-semibold">Cost:</span>
                    <span
                      className={`font-mono font-bold text-xs ${
                        b.cost > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {b.cost > 0 ? `-$${b.cost.toFixed(2)}` : '$0.00'}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-medium flex items-center gap-1 transition ${
                      isSelected
                        ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                        : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        Viewing Below <ArrowDown className="w-3 h-3 animate-bounce" />
                      </>
                    ) : (
                      <>
                        View Trades <ArrowDown className="w-3 h-3 group-hover:translate-y-0.5 transition-transform" />
                      </>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flagged Execution Timeline Section */}
      <div ref={timelineRef} id="behavior-timeline" className="card-white overflow-hidden space-y-0 scroll-mt-20">
        {/* Active Flaw Selection Jump Banner */}
        {selectedFlaw !== 'ALL' && activeBehavior && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/60 px-5 py-3 flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <Filter className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                  <span>Filtered by: <span className="underline decoration-emerald-400 font-extrabold">{activeBehavior.title}</span></span>
                  <span className="bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold">
                    {filteredTrades.length} trades
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {activeBehavior.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => cardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 hover:bg-emerald-100/50 dark:hover:bg-slate-700 rounded-lg border border-emerald-300 dark:border-emerald-700 shadow-xs transition"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                Back to Flaw Cards
              </button>
              <button
                onClick={() => setSelectedFlaw('ALL')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs transition"
              >
                <X className="w-3.5 h-3.5" />
                Clear Filter
              </button>
            </div>
          </div>
        )}

        {/* Table Header & Interactive Filters Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3.5 bg-white dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Flagged Execution Timeline
                </h3>
                <span className="text-[11px] font-semibold font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  {filteredTrades.length} of {data.total_flagged_count} violations
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">
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
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 focus:bg-white dark:focus:bg-slate-800 w-48 transition"
              />
            </div>
          </div>

          {/* Quick Filter Pill Controls: Outcome (Winners / Losers) & Directions & Flaws */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              {/* Winner / Loser Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-lg border dark:border-slate-700/60">
                <button
                  onClick={() => setOutcomeFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                    outcomeFilter === 'ALL'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All ({data.flagged_trades.length})
                </button>
                <button
                  onClick={() => setOutcomeFilter('WIN')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                    outcomeFilter === 'WIN'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
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
                      : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
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
              <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-lg border dark:border-slate-700/60">
                <button
                  onClick={() => setSideFilter('ALL')}
                  className={`px-2 py-1 rounded-md text-xs font-semibold transition ${
                    sideFilter === 'ALL'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Both Sides
                </button>
                <button
                  onClick={() => setSideFilter('LONG')}
                  className={`px-2 py-1 rounded-md text-xs font-semibold transition ${
                    sideFilter === 'LONG'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Long
                </button>
                <button
                  onClick={() => setSideFilter('SHORT')}
                  className={`px-2 py-1 rounded-md text-xs font-semibold transition ${
                    sideFilter === 'SHORT'
                      ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Short
                </button>
              </div>

              {/* Flaw Selector Dropdown */}
              <select
                value={selectedFlaw}
                onChange={(e) => setSelectedFlaw(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 font-medium"
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
            <thead className="bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center font-sans">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        No flagged trades found
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-400">
                        {outcomeFilter !== 'ALL'
                          ? `No ${outcomeFilter === 'WIN' ? 'winning' : 'losing'} trades matched the current flaw filter.`
                          : 'Try clearing your active flaw or search filter.'}
                      </p>
                      {isFilterActive && (
                        <button
                          onClick={resetFilters}
                          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 dark:bg-slate-800 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-700 shadow-sm transition"
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
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition"
                    >
                      <td className="py-3 px-4 font-sans text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {t.exit_time}
                      </td>
                      <td className="py-3 px-4 font-sans font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {t.symbol}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            t.side === 'LONG'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60'
                          }`}
                        >
                          {t.side}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        ${t.position_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{t.leverage}x</td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-bold inline-flex items-center gap-1 ${
                            isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isWin ? '+' : ''}${t.net_pnl.toFixed(2)}
                          <span
                            className={`text-[9px] font-sans font-semibold px-1 py-0.2 rounded ${
                              isWin
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {isWin ? 'WIN' : 'LOSS'}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-500 dark:text-slate-400">
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
                                  ? 'bg-slate-900 dark:bg-slate-700 text-white'
                                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/60'
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
      {selectedTrade &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
            onClick={() => setSelectedTrade(null)}
          >
            <div
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-slate-900 dark:text-slate-100 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
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
                    <p className="text-[11px] text-slate-400 dark:text-slate-400 font-mono">ID: {selectedTrade.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTrade(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                {/* Outcome Card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-400 block">
                      Net PNL
                    </span>
                    <div
                      className={`text-xl font-bold font-mono ${
                        selectedTrade.net_pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {selectedTrade.net_pnl >= 0 ? '+' : ''}${selectedTrade.net_pnl.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-400 block">
                      Result
                    </span>
                    <span
                      className={`inline-block mt-0.5 text-xs font-bold px-2 py-0.5 rounded ${
                        selectedTrade.net_pnl > 0
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                      }`}
                    >
                      {selectedTrade.net_pnl > 0 ? 'WINNER' : 'LOSER'}
                    </span>
                  </div>
                </div>

                {/* Trade Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-sans text-slate-400 dark:text-slate-400 block">Position Size</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      ${selectedTrade.position_value.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-sans text-slate-400 dark:text-slate-400 block">Leverage</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedTrade.leverage}x</span>
                  </div>
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-sans text-slate-400 dark:text-slate-400 block">Hold Duration</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedTrade.duration_mins} mins
                    </span>
                  </div>
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-sans text-slate-400 dark:text-slate-400 block">Exit Time</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-sans text-[11px]">
                      {selectedTrade.exit_time}
                    </span>
                  </div>
                </div>

                {/* Triggered Flaws */}
                <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-300 font-semibold text-xs">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                    Violated Rules Detected
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTrade.flags.map((flag, idx) => (
                      <span
                        key={idx}
                        className="bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 px-2 py-0.5 rounded text-[10px] font-semibold"
                      >
                        {flag.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedTrade(null)}
                  className="w-full py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg font-semibold transition"
                >
                  Close Trade Audit
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
