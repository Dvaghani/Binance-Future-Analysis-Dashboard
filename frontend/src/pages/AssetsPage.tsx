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
} from 'recharts';
import { Award, AlertTriangle, Coins, TrendingUp, TrendingDown } from 'lucide-react';
import { api } from '../services/api';
import { AssetsResponse, AssetItem } from '../types';
import { formatFee, formatCurrency, formatPNL } from '../utils/format';
import { useTheme } from '../context/ThemeContext';

export const AssetsPage: React.FC = () => {
  const { isDark } = useTheme();
  const [data, setData] = useState<AssetsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      const res = await api.getAssets();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return <div className="p-8 animate-pulse space-y-6"><div className="h-72 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl" /></div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Driver / Dragger Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Driver */}
        {data.top_driver ? (
          <div className="card-white p-5 border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Primary Profit Driver
              </span>
              <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 border dark:border-emerald-800/60 px-2 py-0.5 rounded">
                PF: {data.top_driver.profit_factor.toFixed(2)}
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {data.top_driver.symbol}
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {formatPNL(data.top_driver.net_pnl, 2)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ({data.top_driver.win_rate}% win rate over {data.top_driver.trades} trades)
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              This asset provides your strongest statistical edge. Consider allocating a higher share of margin here.
            </p>
          </div>
        ) : null}

        {/* Top Dragger */}
        {data.top_dragger ? (
          <div className="card-white p-5 border-rose-200/80 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                Primary Performance Drag
              </span>
              <span className="text-xs font-mono font-bold text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-950/80 border dark:border-rose-800/60 px-2 py-0.5 rounded">
                PF: {data.top_dragger.profit_factor.toFixed(2)}
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {data.top_dragger.symbol}
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-bold text-rose-600 dark:text-rose-400 font-mono">
                {formatPNL(data.top_dragger.net_pnl, 2)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ({data.top_dragger.win_rate}% win rate over {data.top_dragger.trades} trades)
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              Trading this pair is actively diminishing your account equity. Consider tightening stops or pausing trading on this symbol.
            </p>
          </div>
        ) : null}
      </div>

      {/* PNL by Coin Bar Chart */}
      <div className="card-white p-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Net Realized PNL by Symbol</h3>
        <p className="text-xs text-slate-400 dark:text-slate-400 mb-4">Comparison of cumulative net profits and losses across traded contracts</p>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.assets} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1E293B' : '#E2E8F0'} />
              <XAxis dataKey="symbol" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d: AssetItem = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-hover p-3 rounded-lg text-xs space-y-1">
                        <div className="font-bold text-slate-900 dark:text-white">{d.symbol}</div>
                        <div
                          className={`font-semibold font-mono ${
                            d.net_pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          Net PNL: {formatPNL(d.net_pnl, 2)}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 font-mono">
                          Fee: -{formatFee(d.fees)} | Fund: {d.funding >= 0 ? '+' : ''}{formatFee(d.funding)}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400">Win Rate: {d.win_rate}% ({d.trades} trades)</div>
                        <div className="text-slate-500 dark:text-slate-400">Profit Factor: {d.profit_factor.toFixed(2)}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="net_pnl" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {data.assets.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.net_pnl >= 0 ? '#059669' : '#E11D48'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Asset Table */}
      <div className="card-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Per-Symbol Detailed Statistics</h3>
            <p className="text-xs text-slate-400 dark:text-slate-400">Granular volume, fee impact, and expectancy by traded pair</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-4">Net PNL</th>
                <th className="py-3 px-4">Win Rate</th>
                <th className="py-3 px-4">Trades</th>
                <th className="py-3 px-4">Avg Win</th>
                <th className="py-3 px-4">Avg Loss</th>
                <th className="py-3 px-4">Profit Factor</th>
                <th className="py-3 px-4">Fees</th>
                <th className="py-3 px-4">Funding</th>
                <th className="py-3 px-4">Volume ($)</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {data.assets.map((asset) => {
                const isPos = asset.net_pnl >= 0;
                return (
                  <tr key={asset.symbol} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-sans font-bold text-slate-900 dark:text-white">{asset.symbol}</td>
                    <td className={`py-3 px-4 font-bold tabular-nums ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatPNL(asset.net_pnl, 2)}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{asset.win_rate}%</td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{asset.trades}</td>
                    <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">{formatPNL(asset.avg_win, 2)}</td>
                    <td className="py-3 px-4 text-rose-600 dark:text-rose-400 font-semibold">{formatPNL(-Math.abs(asset.avg_loss), 2)}</td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{asset.profit_factor.toFixed(2)}</td>
                    <td className="py-3 px-4 text-rose-600 dark:text-rose-400 font-semibold text-[11px]">-{formatFee(asset.fees)}</td>
                    <td className={`py-3 px-4 font-semibold text-[11px] ${asset.funding >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>
                      {asset.funding >= 0 ? '+' : ''}{formatFee(asset.funding)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">${asset.volume.toLocaleString()}</td>
                    <td className="py-3 px-4 font-sans">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          asset.net_pnl > 100
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : asset.net_pnl < -100
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {asset.net_pnl > 100 ? 'Profit Driver' : asset.net_pnl < -100 ? 'Dragger' : 'Neutral'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
