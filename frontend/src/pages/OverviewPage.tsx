import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  DollarSign,
  Percent,
  Activity,
  Award,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Radio,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { api } from '../services/api';
import { OverviewData, EquityPoint, PositionsResponse } from '../types';
import { useTrading } from '../context/TradingContext';
import { useTheme } from '../context/ThemeContext';

export const OverviewPage: React.FC = () => {
  const { setActiveTab, activeAccountId, status, dataRefreshKey } = useTrading();
  const { isDark } = useTheme();
  const [data, setData] = useState<OverviewData | null>(null);
  const [positionsData, setPositionsData] = useState<PositionsResponse | null>(null);
  const [equityData, setEquityData] = useState<EquityPoint[]>([]);
  const [timeframe, setTimeframe] = useState<string>('30D');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeAccountId, status?.is_demo_mode, status?.last_sync_time, dataRefreshKey]);

  useEffect(() => {
    loadEquity();
  }, [timeframe, activeAccountId, status?.is_demo_mode, status?.last_sync_time, dataRefreshKey]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, posRes] = await Promise.allSettled([
        api.getOverview(),
        api.getPositions(),
      ]);
      if (res.status === 'fulfilled') {
        setData(res.value);
      } else {
        throw res.reason;
      }
      if (posRes.status === 'fulfilled') {
        setPositionsData(posRes.value);
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const loadEquity = async () => {
    try {
      const res = await api.getEquityCurve(timeframe);
      setEquityData(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl" />
          ))}
        </div>
        <div className="h-80 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-4">
        <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-800/60">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Failed to load analytics</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">{error || 'Unknown error occurred.'}</p>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Connection
        </button>
      </div>
    );
  }

  const { kpis } = data;
  const isNetPositive = kpis.net_pnl >= 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Executive Narrative Banner */}
      <div className="card-white p-4 border-l-4 border-emerald-500 bg-gradient-to-r from-emerald-50/30 dark:from-emerald-950/20 via-white dark:via-slate-900 to-white dark:to-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">
              Trading Performance Diagnosis
            </span>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
              {data.quick_insight}
            </p>
          </div>
        </div>
        <button
          onClick={() => setActiveTab('behavior')}
          className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition shrink-0 ml-4"
        >
          <span>View Psychology</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Balance & Equity */}
        <div className="card-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              Wallet Balance
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Futures</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-1 tabular-nums font-mono">
            ${kpis.current_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between font-mono">
            <span>Equity:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              ${(kpis.equity ?? kpis.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Net PNL */}
        <div className="card-white p-4">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
            Total Net PNL
          </span>
          <div
            className={`text-lg font-bold mt-1 tabular-nums font-mono flex items-center gap-0.5 ${
              isNetPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {isNetPositive ? '+' : ''}${kpis.net_pnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            ROI: <span className="font-semibold">{kpis.roi_pct >= 0 ? '+' : ''}{kpis.roi_pct}%</span>
          </span>
        </div>

        {/* Win Rate */}
        <div className="card-white p-4">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
            Win Rate
          </span>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-1 tabular-nums font-mono">
            {kpis.win_rate}%
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {kpis.total_trades} Closed Trades
          </span>
        </div>

        {/* Profit Factor */}
        <div className="card-white p-4">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
            Profit Factor
          </span>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-1 tabular-nums font-mono">
            {kpis.profit_factor.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {kpis.profit_factor >= 1.5 ? 'Strong edge' : kpis.profit_factor >= 1.0 ? 'Breakeven edge' : 'Sub-optimal'}
          </span>
        </div>

        {/* Max Drawdown */}
        <div className="card-white p-4">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
            Max Drawdown
          </span>
          <div className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1 tabular-nums font-mono">
            {kpis.max_drawdown_pct > 0 ? `-${kpis.max_drawdown_pct.toFixed(2)}%` : '0.00%'}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            ${kpis.max_drawdown.toFixed(2)} peak-to-trough
          </span>
        </div>

        {/* 30D PNL */}
        <div className="card-white p-4">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
            30-Day PNL
          </span>
          <div
            className={`text-lg font-bold mt-1 tabular-nums font-mono ${
              kpis.thirty_day_pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {kpis.thirty_day_pnl >= 0 ? '+' : ''}${kpis.thirty_day_pnl.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Today: {kpis.today_pnl >= 0 ? '+' : ''}${kpis.today_pnl.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Live Positions Quick Radar Banner */}
      {positionsData && positionsData.positions_count > 0 && (
        <div
          onClick={() => setActiveTab('positions')}
          className="bg-white dark:bg-[#0E131F] p-4 rounded-xl border border-emerald-500/30 dark:border-emerald-500/40 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:border-emerald-500/60 transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Live Liquidation Radar
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/60">
                  {positionsData.positions_count} ACTIVE {positionsData.positions_count === 1 ? 'POSITION' : 'POSITIONS'}
                </span>
                {positionsData.highest_risk_tier !== 'Safe' && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                    positionsData.highest_risk_tier === 'Critical'
                      ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-700/60 animate-pulse'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700/60'
                  }`}>
                    {positionsData.highest_risk_tier.toUpperCase()} RISK DETECTED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2.5">
                <span>Exposure: <strong className="font-mono text-slate-700 dark:text-slate-300">${positionsData.total_exposure.toLocaleString()}</strong></span>
                <span>•</span>
                <span>Unrealized: <strong className={`font-mono ${positionsData.total_unrealized_pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{positionsData.total_unrealized_pnl >= 0 ? '+' : ''}${positionsData.total_unrealized_pnl.toFixed(2)}</strong></span>
                <span>•</span>
                <span>Next Funding in: <strong className="font-mono text-slate-700 dark:text-slate-300">{Math.floor(positionsData.funding_countdown_seconds / 3600)}h {Math.floor((positionsData.funding_countdown_seconds % 3600) / 60)}m</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
            <span>Open Liquidation Radar</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Equity Curve Chart Section */}
      <div className="card-white p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Account Equity & Cumulative PNL</h2>
            <p className="text-xs text-slate-400 dark:text-slate-400">Total cumulative net performance over time</p>
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700/80">
            {['1D', '7D', '30D', '3M', '6M', '1Y', 'ALL'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  timeframe === tf
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equityData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1E293B' : '#E2E8F0'} />
              <XAxis
                dataKey="display_time"
                tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={timeframe === '1D' ? 35 : 45}
                tickFormatter={(val: string, idx: number) => {
                  if (timeframe === '1D') {
                    return val;
                  }
                  if (idx > 0 && equityData[idx - 1]?.display_time === val) {
                    return '';
                  }
                  return val;
                }}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-hover p-3 rounded-lg text-xs space-y-1">
                        <div className="text-slate-400 dark:text-slate-500 font-medium">{d.timestamp || d.date}</div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          Equity: <span className="font-mono">${d.equity?.toFixed(2)}</span>
                        </div>
                        <div
                          className={`font-semibold font-mono ${
                            d.cumulative_pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          Cum PNL: {d.cumulative_pnl >= 0 ? '+' : ''}${d.cumulative_pnl?.toFixed(2)}
                        </div>
                        <div className="text-rose-500 dark:text-rose-400 font-mono text-[11px]">
                          Drawdown: {d.drawdown_pct > 0 ? `-${d.drawdown_pct?.toFixed(2)}%` : '0.00%'} (${d.drawdown?.toFixed(2)})
                        </div>
                        {d.symbol && (
                          <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span>Trade: {d.symbol} {d.side}</span>
                            <span className={d.net_pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                              {d.net_pnl >= 0 ? '+' : ''}${d.net_pnl?.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="#059669"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#equityGrad)"
                isAnimationActive={false}
                activeDot={{ r: 4, stroke: '#059669', strokeWidth: 2, fill: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Intelligence & Diagnostic Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Directional Analysis Highlight */}
        <div
          onClick={() => setActiveTab('long-short')}
          className="card-white p-5 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Directional Edge
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
            {data.quick_insight}
          </p>
          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mt-3 block">
            Analyze Long vs Short Disparity →
          </span>
        </div>

        {/* Top Asset Driver & Dragger */}
        <div
          onClick={() => setActiveTab('assets')}
          className="card-white p-5 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              Asset Profitability
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
          </div>
          <div className="space-y-2">
            {data.top_asset && (
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Top Driver: {data.top_asset.symbol}</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  +${data.top_asset.net_pnl.toFixed(2)}
                </span>
              </div>
            )}
            {data.top_dragger && (
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Top Dragger: {data.top_dragger.symbol}</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  -${Math.abs(data.top_dragger.net_pnl).toFixed(2)}
                </span>
              </div>
            )}
          </div>
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-3 block">
            Inspect All Traded Coins →
          </span>
        </div>

        {/* Risk & Behavior Score */}
        <div
          onClick={() => setActiveTab('risk')}
          className="card-white p-5 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Risk Health Score
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{data.risk_score}</span>
            <span className="text-xs text-slate-400">/ 100</span>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded ml-auto">
              {data.risk_tier}
            </span>
          </div>
          {data.top_behavior && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Behavior note: <span className="font-medium text-slate-700 dark:text-slate-200">{data.top_behavior.title}</span> ({data.top_behavior.count} incidents)
            </p>
          )}
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-2 block">
            Inspect Risk Breakdown →
          </span>
        </div>
      </div>
    </div>
  );
};
