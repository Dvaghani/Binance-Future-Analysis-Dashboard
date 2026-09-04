import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  Clock,
  Zap,
  Target,
  Scale,
  Flame,
  Snowflake,
} from 'lucide-react';
import { api } from '../services/api';
import { EquityPoint, WinnerLoserStats } from '../types';

export const PerformancePage: React.FC = () => {
  const [equityData, setEquityData] = useState<EquityPoint[]>([]);
  const [timeframe, setTimeframe] = useState<string>('30D');
  const [comparisons, setComparisons] = useState<any>(null);
  const [winnerLoser, setWinnerLoser] = useState<WinnerLoserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformance();
  }, [timeframe]);

  const loadPerformance = async () => {
    try {
      const [eqRes, compRes, wlRes] = await Promise.all([
        api.getEquityCurve(timeframe),
        api.getReport().then((r) => r.performance_comparison),
        api.getWinnerLoserStats(),
      ]);
      setEquityData(eqRes.data);
      setComparisons(compRes);
      setWinnerLoser(wlRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 animate-pulse space-y-6"><div className="h-80 bg-slate-200/60 rounded-xl" /></div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Chart Section */}
      <div className="card-white p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Cumulative Net PNL & Drawdown Curve</h2>
            <p className="text-xs text-slate-400">Continuous account equity progression and peak-to-trough drawdowns</p>
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            {['1D', '7D', '30D', '3M', '6M', '1Y', 'ALL'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  timeframe === tf
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Dual Chart (Equity & Drawdown) */}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={equityData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="pnlArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis
                yAxisId="equity"
                domain={['auto', 'auto']}
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-200 shadow-hover p-3 rounded-lg text-xs space-y-1">
                        <div className="text-slate-400 font-medium">{d.timestamp}</div>
                        <div className="font-bold text-slate-900">
                          Equity: <span className="font-mono">${d.equity?.toFixed(2)}</span>
                        </div>
                        <div className="font-semibold text-emerald-600 font-mono">
                          Cumulative PNL: {d.cumulative_pnl >= 0 ? '+' : ''}${d.cumulative_pnl?.toFixed(2)}
                        </div>
                        <div className="text-rose-500 font-mono text-[11px]">
                          Drawdown: -{d.drawdown_pct?.toFixed(1)}% (${d.drawdown?.toFixed(2)})
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                yAxisId="equity"
                type="monotone"
                dataKey="equity"
                stroke="#059669"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#pnlArea)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Winner vs Loser Analytics Grid */}
      {winnerLoser && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="card-white p-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Avg Winner vs Avg Loser
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-base font-bold text-emerald-600 font-mono tabular-nums">
                +${winnerLoser.avg_winner}
              </span>
              <span className="text-xs text-slate-400">/</span>
              <span className="text-base font-bold text-rose-600 font-mono tabular-nums">
                -${winnerLoser.avg_loser}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Loss-to-Win Ratio: <span className="font-semibold text-slate-700">{winnerLoser.loss_to_win_ratio}×</span>
            </span>
          </div>

          <div className="card-white p-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Mathematical Expectancy
            </span>
            <div className="text-base font-bold text-slate-900 mt-1 font-mono tabular-nums">
              {winnerLoser.expectancy >= 0 ? '+' : ''}${winnerLoser.expectancy}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Average net return expected per trade
            </span>
          </div>

          <div className="card-white p-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Holding Duration Asymmetry
            </span>
            <div className="text-base font-bold text-slate-900 mt-1 font-mono tabular-nums">
              {winnerLoser.holding_time_ratio}× longer losers
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Win avg: {winnerLoser.avg_win_holding_mins}m vs Loss avg: {winnerLoser.avg_loss_holding_mins}m
            </span>
          </div>

          <div className="card-white p-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Max Streaks
            </span>
            <div className="flex items-center gap-3 mt-1 text-sm font-bold font-mono">
              <span className="flex items-center gap-1 text-emerald-600">
                <Flame className="w-3.5 h-3.5" />
                {winnerLoser.max_win_streak} Wins
              </span>
              <span className="flex items-center gap-1 text-rose-600">
                <Snowflake className="w-3.5 h-3.5" />
                {winnerLoser.max_loss_streak} Losses
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Historical consecutive streak limits
            </span>
          </div>
        </div>
      )}

      {/* Period-Over-Period Comparison Table */}
      {comparisons && (
        <div className="card-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Performance Over Time Comparison</h3>
              <p className="text-xs text-slate-400">Pace comparison to determine whether execution is improving</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-5">Period</th>
                  <th className="py-3 px-5">Net PNL</th>
                  <th className="py-3 px-5">Win Rate</th>
                  <th className="py-3 px-5">Profit Factor</th>
                  <th className="py-3 px-5">Avg Trade</th>
                  <th className="py-3 px-5">Trades</th>
                  <th className="py-3 px-5">Avg Leverage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {[
                  { label: 'This Week (7D)', data: comparisons.this_week },
                  { label: 'Last Week', data: comparisons.last_week },
                  { label: 'This Month (30D)', data: comparisons.this_month },
                  { label: 'Last Month', data: comparisons.last_month },
                  { label: 'Last 3 Months (90D)', data: comparisons.last_3_months },
                  { label: 'All-Time', data: comparisons.all_time },
                ].map((row, idx) => {
                  if (!row.data) return null;
                  const isPos = row.data.pnl >= 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-5 font-sans font-semibold text-slate-800">{row.label}</td>
                      <td className={`py-3 px-5 font-bold tabular-nums ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPos ? '+' : ''}${row.data.pnl?.toFixed(2)}
                      </td>
                      <td className="py-3 px-5 text-slate-700">{row.data.win_rate}%</td>
                      <td className="py-3 px-5 text-slate-700">{row.data.profit_factor?.toFixed(2)}</td>
                      <td className={`py-3 px-5 ${row.data.avg_trade >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {row.data.avg_trade >= 0 ? '+' : ''}${row.data.avg_trade?.toFixed(2)}
                      </td>
                      <td className="py-3 px-5 text-slate-700">{row.data.trades}</td>
                      <td className="py-3 px-5 text-slate-500">{row.data.avg_leverage}x</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
