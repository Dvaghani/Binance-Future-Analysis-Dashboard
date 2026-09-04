import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  Clock,
  Calendar,
  Globe,
  Flame,
  AlertTriangle,
  Sun,
  Moon,
  Zap,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { api } from '../services/api';
import { TimeAnalysisData, HourlyItem } from '../types';
import { useTheme } from '../context/ThemeContext';

export const TimeAnalysisPage: React.FC = () => {
  const { isDark } = useTheme();
  const [data, setData] = useState<TimeAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.getTimeAnalysis();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-28 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl" />
          <div className="h-28 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl" />
        </div>
        <div className="h-80 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl" />
          <div className="h-64 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl" />
        </div>
      </div>
    );
  }

  // Calculate quick stats from hourly data
  const totalTrades = data.hourly.reduce((sum, h) => sum + h.trades, 0);
  const activeHours = data.hourly.filter((h) => h.trades > 0);
  const bestHour = activeHours.length
    ? [...activeHours].sort((a, b) => b.net_pnl - a.net_pnl)[0]
    : null;
  const mostActiveHour = activeHours.length
    ? [...activeHours].sort((a, b) => b.trades - a.trades)[0]
    : null;

  const sessionDetails: Record<string, { time: string; icon: React.ElementType; color: string }> = {
    Asian: { time: '00:00 – 08:00 UTC', icon: Moon, color: 'text-indigo-500 dark:text-indigo-400' },
    London: { time: '08:00 – 16:00 UTC', icon: Sun, color: 'text-amber-500 dark:text-amber-400' },
    'New York': { time: '13:00 – 21:00 UTC', icon: Zap, color: 'text-emerald-500 dark:text-emerald-400' },
    'After Hours': { time: '21:00 – 00:00 UTC', icon: Clock, color: 'text-purple-500 dark:text-purple-400' },
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Best / Worst Window Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Optimal Window */}
        <div className="card-white p-5 border-emerald-300/60 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
              Optimal Trading Window (UTC)
            </span>
            <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {data.best_window || 'No data yet'}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Your highest expectancy and cleanest win-rate clusters statistically appear in this timeframe.
            </p>
          </div>
        </div>

        {/* High-Risk Window */}
        <div className="card-white p-5 border-rose-300/60 dark:border-rose-800/60 bg-rose-50/30 dark:bg-rose-950/20 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 uppercase tracking-wider block">
              High-Risk Time Window (UTC)
            </span>
            <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {data.worst_window || 'No data yet'}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Statistically your most loss-prone window. Protect capital by stepping away or avoiding fresh entries.
            </p>
          </div>
        </div>
      </div>

      {/* 24-Hour PNL Distribution Bar Chart */}
      <div className="card-white p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                24-Hour Performance Profile (UTC)
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Realized net PNL and trade volume across each hourly bucket of the day
            </p>
          </div>

          {/* Key Metric Badges */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {bestHour && (
              <div className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 font-medium text-[11px]">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Peak: {bestHour.label} (+${bestHour.net_pnl.toFixed(2)})</span>
              </div>
            )}
            {mostActiveHour && (
              <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-medium text-[11px]">
                <Activity className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Most Active: {mostActiveHour.label} ({mostActiveHour.trades} trades)</span>
              </div>
            )}
            <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
              Total: {totalTrades} trades
            </div>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.hourly} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={isDark ? '#1E293B' : '#F1F5F9'}
              />
              <ReferenceLine y={0} stroke={isDark ? '#334155' : '#CBD5E1'} strokeWidth={1} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: isDark ? '#64748B' : '#94A3B8' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: isDark ? '#64748B' : '#94A3B8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d: HourlyItem = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xl p-3 rounded-lg text-xs space-y-1 z-50">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between gap-3">
                          <span>{d.label} UTC</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {d.trades} {d.trades === 1 ? 'trade' : 'trades'}
                          </span>
                        </div>
                        <div
                          className={`font-semibold font-mono text-sm ${
                            d.net_pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {d.net_pnl >= 0 ? '+' : ''}${d.net_pnl.toFixed(2)}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px] pt-0.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                          <span>Win Rate:</span>
                          <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                            {d.trades > 0 ? `${d.win_rate}%` : 'N/A'}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="net_pnl" radius={[4, 4, 0, 0]}>
                {data.hourly.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.trades === 0
                        ? isDark ? '#1E293B' : '#E2E8F0'
                        : entry.net_pnl >= 0
                        ? '#059669'
                        : '#E11D48'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Day of Week & Trading Sessions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Day of Week Table */}
        <div className="card-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Day of the Week Distribution</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Aggregated performance by day to identify recurring weekly edges or blindspots
          </p>

          <div className="space-y-2">
            {data.daily.map((d) => (
              <div
                key={d.day}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors text-xs"
              >
                <span className="font-semibold text-slate-800 dark:text-slate-200 w-24">{d.day}</span>
                <div className="flex items-center gap-4">
                  <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px] w-16 text-right">
                    {d.trades} {d.trades === 1 ? 'trade' : 'trades'}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px] w-14 text-right">
                    {d.trades > 0 ? `${d.win_rate}% WR` : '—'}
                  </span>
                  <span
                    className={`font-mono font-bold w-20 text-right ${
                      d.net_pnl > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : d.net_pnl < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {d.net_pnl > 0 ? '+' : ''}${d.net_pnl.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Major Sessions Breakdown */}
        <div className="card-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Global Trading Sessions</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Benchmark performance across Asian, London, and New York market opening liquidity
          </p>

          <div className="space-y-3">
            {data.sessions.map((s) => {
              const meta = sessionDetails[s.session] || {
                time: 'UTC',
                icon: Globe,
                color: 'text-slate-500 dark:text-slate-400',
              };
              const Icon = meta.icon;

              return (
                <div
                  key={s.session}
                  className="p-3.5 border border-slate-200/80 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white text-xs block leading-tight">
                          {s.session} Session
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block">
                          {meta.time}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`font-mono font-bold text-sm ${
                        s.net_pnl > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : s.net_pnl < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {s.net_pnl > 0 ? '+' : ''}${s.net_pnl.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                    <span>{s.trades} {s.trades === 1 ? 'Trade' : 'Trades'}</span>
                    <span>Win Rate: {s.win_rate}%</span>
                    <span>Profit Factor: {s.profit_factor >= 90 ? '∞' : s.profit_factor.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
