import React, { useEffect, useState, useRef } from 'react';
import {
  Radio,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Coins,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  DollarSign,
  Activity,
  Zap
} from 'lucide-react';
import { api } from '../services/api';
import { PositionsResponse, LivePositionItem } from '../types';
import { formatCurrency, formatPNL, formatFee } from '../utils/format';

export const PositionsPage: React.FC = () => {
  const [data, setData] = useState<PositionsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [sideFilter, setSideFilter] = useState<'ALL' | 'LONG' | 'SHORT' | 'RISK'>('ALL');
  const [autoRefreshSecs, setAutoRefreshSecs] = useState<number>(10);
  const [countdown, setCountdown] = useState<number>(0);
  const timerRef = useRef<any>(null);

  const fetchPositions = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.getPositions();
      setData(res);
      setCountdown(res.funding_countdown_seconds);
    } catch (err) {
      console.error('Failed to load live positions:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  // Live 1-second interval timer for funding settlement countdown
  useEffect(() => {
    const secTimer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(secTimer);
  }, []);

  // Auto-refresh timer for positions data
  useEffect(() => {
    if (autoRefreshSecs <= 0) return;
    timerRef.current = setInterval(() => {
      fetchPositions(false);
    }, autoRefreshSecs * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefreshSecs]);

  const formatCountdown = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Critical':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
          bar: 'bg-rose-500',
          badge: 'bg-rose-500 text-white',
          glow: 'shadow-rose-500/20'
        };
      case 'Elevated':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
          bar: 'bg-amber-500',
          badge: 'bg-amber-500 text-white',
          glow: 'shadow-amber-500/20'
        };
      case 'Moderate':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
          bar: 'bg-blue-500',
          badge: 'bg-blue-500 text-white',
          glow: 'shadow-blue-500/20'
        };
      default: // Safe
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
          bar: 'bg-emerald-500',
          badge: 'bg-emerald-500 text-white',
          glow: 'shadow-emerald-500/20'
        };
    }
  };

  if (loading && !data) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
        <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>
    );
  }

  const positions = data?.positions || [];
  const filteredPositions = positions.filter((p) => {
    if (sideFilter === 'ALL') return true;
    if (sideFilter === 'LONG') return p.side === 'LONG';
    if (sideFilter === 'SHORT') return p.side === 'SHORT';
    if (sideFilter === 'RISK') return p.risk_tier === 'Elevated' || p.risk_tier === 'Critical';
    return true;
  });

  const criticalCount = positions.filter((p) => p.risk_tier === 'Critical').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Live Auto-Refresh Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#0E131F] p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Live Open Positions & Liquidation Radar
                </h1>
                {data?.is_demo_mode ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-700/60">
                    SIMULATION MODE
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    LIVE BINANCE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time margin risk, distance-to-liquidation radar, and 8-hour funding rate projections.
              </p>
            </div>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {/* Auto Refresh Interval */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">Auto-poll:</span>
            <select
              value={autoRefreshSecs}
              onChange={(e) => setAutoRefreshSecs(Number(e.target.value))}
              className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={0}>Off</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchPositions(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Critical Liquidation Risk Alert Banner if any position is in Danger */}
      {criticalCount > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-xs font-bold text-rose-900 dark:text-rose-200">
              CRITICAL LIQUIDATION WARNING ({criticalCount} position within 3% of liquidation price)
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
              One or more of your open contracts is dangerously close to its liquidation threshold. Review margin buffer or deleverage immediately.
            </p>
          </div>
        </div>
      )}

      {/* Summary KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Positions Count */}
        <div className="bg-white dark:bg-[#0E131F] p-4 rounded-xl border border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Open Positions</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {data?.positions_count || 0}
            </span>
            <span className="text-xs font-medium text-slate-400">active</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex gap-2">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {positions.filter((p) => p.side === 'LONG').length} Long
            </span>
            <span>•</span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold">
              {positions.filter((p) => p.side === 'SHORT').length} Short
            </span>
          </div>
        </div>

        {/* Card 2: Total Exposure */}
        <div className="bg-white dark:bg-[#0E131F] p-4 rounded-xl border border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Exposure</span>
            <Coins className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {formatCurrency(data?.total_exposure || 0)}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Total notional contract value
          </div>
        </div>

        {/* Card 3: Net Unrealized PnL */}
        <div className="bg-white dark:bg-[#0E131F] p-4 rounded-xl border border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Unrealized PnL</span>
            {(data?.total_unrealized_pnl || 0) >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-500" />
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                (data?.total_unrealized_pnl || 0) >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatPNL(data?.total_unrealized_pnl || 0)}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Balance: {formatCurrency(data?.account_balance || 0)}
          </div>
        </div>

        {/* Card 4: Margin Utilization */}
        <div className="bg-white dark:bg-[#0E131F] p-4 rounded-xl border border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Margin Utilized</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {data?.margin_utilization_pct || 0}%
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({formatCurrency(data?.total_margin_used || 0)})
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                (data?.margin_utilization_pct || 0) > 75
                  ? 'bg-rose-500'
                  : (data?.margin_utilization_pct || 0) > 40
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, data?.margin_utilization_pct || 0)}%` }}
            />
          </div>
        </div>

        {/* Card 5: Next Funding Interval Countdown */}
        <div className="bg-white dark:bg-[#0E131F] p-4 rounded-xl border border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Funding Countdown</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {formatCountdown(countdown)}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Est. Net Fee:</span>
            <span
              className={`font-semibold font-mono ${
                (data?.total_estimated_funding_fee || 0) >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatPNL(data?.total_estimated_funding_fee || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Liquidation Radar Visual Center */}
      <div className="bg-white dark:bg-[#0E131F] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              Liquidation Proximity Radar
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visual proximity to liquidation threshold for active contracts. Higher buffer % indicates greater safety cushion.
            </p>
          </div>

          {/* Risk Tier Legend */}
          <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> &gt;15% Safe
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> 8-15% Moderate
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> 3-8% Elevated
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> &lt;3% Critical
            </span>
          </div>
        </div>

        {/* Position Radar Cards Grid */}
        {positions.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <p className="text-xs text-slate-400 font-medium">No open positions currently active on this account.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {positions.map((pos) => {
              const tierStyle = getTierColor(pos.risk_tier);
              const dist = pos.liquidation_distance_pct;

              return (
                <div
                  key={`${pos.symbol}-${pos.side}`}
                  className={`p-4 rounded-xl border transition-all ${tierStyle.bg}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                          {pos.symbol}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            pos.side === 'LONG'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {pos.side} {pos.leverage}x
                        </span>
                        <span className="text-[10px] uppercase font-semibold text-slate-400">
                          {pos.margin_type}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Size: {Math.abs(pos.position_amt)} ({formatCurrency(pos.position_value)})
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tierStyle.badge}`}>
                      {pos.risk_tier.toUpperCase()}
                    </span>
                  </div>

                  {/* Liquidation Buffer Bar */}
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Buffer to Liquidation:</span>
                      <span className="font-bold font-mono text-slate-900 dark:text-white">
                        {dist !== null ? `${dist.toFixed(2)}%` : 'N/A'}
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${tierStyle.bar}`}
                        style={{
                          width: dist !== null ? `${Math.min(100, (dist / 20) * 100)}%` : '100%',
                        }}
                      />
                    </div>
                  </div>

                  {/* Price Points Strip */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Entry Price</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        ${pos.entry_price.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Mark Price</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        ${pos.mark_price.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-rose-500 block text-[10px] font-medium">Liq. Price</span>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        ${pos.liquidation_price > 0 ? pos.liquidation_price.toLocaleString() : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Unrealized PnL Strip */}
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Unrealized PnL:</span>
                    <span
                      className={`font-mono font-bold ${
                        pos.unrealized_pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatPNL(pos.unrealized_pnl)} ({pos.pnl_percentage >= 0 ? '+' : ''}
                      {pos.pnl_percentage.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Positions Table & Detailed Execution Grid */}
      <div className="bg-white dark:bg-[#0E131F] rounded-2xl border border-slate-200 dark:border-slate-800/80 overflow-hidden">
        {/* Table Filter Tabs */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
            <button
              onClick={() => setSideFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                sideFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({positions.length})
            </button>
            <button
              onClick={() => setSideFilter('LONG')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                sideFilter === 'LONG'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Longs ({positions.filter((p) => p.side === 'LONG').length})
            </button>
            <button
              onClick={() => setSideFilter('SHORT')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                sideFilter === 'SHORT'
                  ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Shorts ({positions.filter((p) => p.side === 'SHORT').length})
            </button>
            <button
              onClick={() => setSideFilter('RISK')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                sideFilter === 'RISK'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              In Risk ({positions.filter((p) => p.risk_tier === 'Elevated' || p.risk_tier === 'Critical').length})
            </button>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Showing {filteredPositions.length} of {positions.length} active positions
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4">Contract</th>
                <th className="py-3 px-4">Side & Leverage</th>
                <th className="py-3 px-4 text-right">Size / Value</th>
                <th className="py-3 px-4 text-right">Entry Price</th>
                <th className="py-3 px-4 text-right">Mark Price</th>
                <th className="py-3 px-4 text-right">Liq. Price</th>
                <th className="py-3 px-4 text-center">Safety Buffer</th>
                <th className="py-3 px-4 text-right">Unrealized PnL</th>
                <th className="py-3 px-4 text-right">Est. Next Funding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {filteredPositions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                    No positions found matching selected filter.
                  </td>
                </tr>
              ) : (
                filteredPositions.map((p) => {
                  const tierStyle = getTierColor(p.risk_tier);
                  return (
                    <tr
                      key={`${p.symbol}-${p.side}-row`}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-white font-mono block">
                          {p.symbol}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          {p.margin_type} margin
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.side === 'LONG'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                            }`}
                          >
                            {p.side}
                          </span>
                          <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                            {p.leverage}x
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {Math.abs(p.position_amt)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {formatCurrency(p.position_value)}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300 font-medium">
                        ${p.entry_price.toLocaleString()}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-white font-semibold">
                        ${p.mark_price.toLocaleString()}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                        {p.liquidation_price > 0 ? `$${p.liquidation_price.toLocaleString()}` : '—'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tierStyle.badge}`}>
                            {p.liquidation_distance_pct !== null
                              ? `${p.liquidation_distance_pct.toFixed(1)}%`
                              : 'SAFE'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono">
                        <div
                          className={`font-bold ${
                            p.unrealized_pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {formatPNL(p.unrealized_pnl)}
                        </div>
                        <div
                          className={`text-[10px] font-medium ${
                            p.pnl_percentage >= 0 ? 'text-emerald-500' : 'text-rose-500'
                          }`}
                        >
                          {p.pnl_percentage >= 0 ? '+' : ''}
                          {p.pnl_percentage.toFixed(2)}%
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono">
                        <span
                          className={`font-semibold ${
                            p.estimated_funding_fee >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {formatPNL(p.estimated_funding_fee)}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          {(p.funding_rate * 100).toFixed(4)}%
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
    </div>
  );
};
export default PositionsPage;
