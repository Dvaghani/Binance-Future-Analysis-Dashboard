import React, { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { LongShortData } from '../types';
import { formatFee, formatCurrency, formatPNL } from '../utils/format';

export const LongShortPage: React.FC = () => {
  const [data, setData] = useState<LongShortData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.getLongShort();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return <div className="p-8 animate-pulse space-y-6"><div className="h-72 bg-slate-200/60 rounded-xl" /></div>;
  }

  const { long, short, insight } = data;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Objective Narrative Callout */}
      <div className="card-white p-5 border-l-4 border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 dark:border-indigo-500">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
            Objective Directional Diagnostic
          </span>
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
          {insight}
        </p>
      </div>

      {/* Side-by-Side Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LONG Side Card */}
        <div className="card-white p-6 border-emerald-200/80 dark:border-emerald-800/40 bg-emerald-50/10 dark:bg-emerald-950/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">LONG Positions</h3>
                <span className="text-xs text-slate-400 dark:text-slate-500">{long.trades} Executed Trades</span>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-mono">
              WR: {long.win_rate}%
            </span>
          </div>

          <div className="space-y-3.5 pt-2">
            <div className="flex items-baseline justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <span className="text-xs text-slate-500 dark:text-slate-400">Net Realized PNL</span>
              <span className={`text-xl font-bold font-mono tabular-nums ${long.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatPNL(long.pnl, 2)}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Profit Factor</span>
              <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                {long.profit_factor.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Average Winning Trade</span>
              <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatPNL(long.avg_winner, 2)}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Average Losing Trade</span>
              <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
                {formatPNL(-Math.abs(long.avg_loser), 2)}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Position Volume</span>
              <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                ${long.volume.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Trading Fees Paid</span>
              <span className="text-xs font-mono text-rose-600 dark:text-rose-400 font-semibold">
                -{formatFee(long.fees)}
              </span>
            </div>
          </div>
        </div>

        {/* SHORT Side Card */}
        <div className="card-white p-6 border-rose-200/80 dark:border-rose-800/40 bg-rose-50/10 dark:bg-rose-950/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center justify-center">
                <ArrowDownRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">SHORT Positions</h3>
                <span className="text-xs text-slate-400 dark:text-slate-500">{short.trades} Executed Trades</span>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 font-mono">
              WR: {short.win_rate}%
            </span>
          </div>

          <div className="space-y-3.5 pt-2">
            <div className="flex items-baseline justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <span className="text-xs text-slate-500 dark:text-slate-400">Net Realized PNL</span>
              <span className={`text-xl font-bold font-mono tabular-nums ${short.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatPNL(short.pnl, 2)}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Profit Factor</span>
              <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                {short.profit_factor.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Average Winning Trade</span>
              <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatPNL(short.avg_winner, 2)}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Average Losing Trade</span>
              <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
                {formatPNL(-Math.abs(short.avg_loser), 2)}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Position Volume</span>
              <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                ${short.volume.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Trading Fees Paid</span>
              <span className="text-xs font-mono text-rose-600 dark:text-rose-400 font-semibold">
                -{formatFee(short.fees)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
