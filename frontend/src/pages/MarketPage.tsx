import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { MarketRegime } from '../types';

export const MarketPage: React.FC = () => {
  const [regimes, setRegimes] = useState<MarketRegime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMarket();
  }, []);

  const loadMarket = async () => {
    try {
      const res = await api.getMarketRegimes();
      setRegimes(res.regimes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 animate-pulse space-y-6"><div className="h-72 bg-slate-200/60 rounded-xl" /></div>;
  }

  const bestRegime = regimes.reduce((prev, curr) => (curr.net_pnl > (prev?.net_pnl ?? -Infinity) ? curr : prev), regimes[0]);
  const worstRegime = regimes.reduce((prev, curr) => (curr.net_pnl < (prev?.net_pnl ?? Infinity) ? curr : prev), regimes[0]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Context Banner */}
      <div className="card-white p-5 border-l-4 border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 dark:border-indigo-500">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
            Market Condition & Strategy Fit
          </span>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
          {bestRegime && worstRegime ? (
            <>
              Your strategy performs strongest in <strong className="text-slate-900 dark:text-white">{bestRegime.regime}</strong> market regimes ({bestRegime.win_rate}% win rate, +${bestRegime.net_pnl.toFixed(2)} PNL). Conversely, performance struggles in <strong className="text-slate-900 dark:text-white">{worstRegime.regime}</strong> environments ({worstRegime.win_rate}% win rate, -${Math.abs(worstRegime.net_pnl).toFixed(2)} PNL).
            </>
          ) : (
            'Evaluating historical trades against market conditions.'
          )}
        </p>
      </div>

      {/* Regimes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {regimes.map((r) => {
          const isProfitable = r.net_pnl > 0;
          return (
            <div
              key={r.regime}
              className={`card-white p-5 border-slate-200 dark:border-slate-800 ${
                isProfitable ? 'bg-emerald-50/10 dark:bg-emerald-950/10' : 'bg-rose-50/10 dark:bg-rose-950/10'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-900 dark:text-white">{r.regime}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isProfitable
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {isProfitable ? 'Profitable' : 'Negative'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-baseline border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-slate-500 dark:text-slate-400">Net Realized PNL:</span>
                  <span
                    className={`font-bold font-mono text-base ${
                      isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {isProfitable ? '+' : ''}${r.net_pnl.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Win Rate:</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-200">{r.win_rate}%</span>
                </div>

                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Profit Factor:</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-200">{r.profit_factor.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Trades Count:</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-200">{r.trades}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Market Regimes Comparison Table */}
      <div className="card-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Performance by Regime Classification</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">Determining market environments suitable for your execution style</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-5">Regime</th>
                <th className="py-3 px-5">Trades Executed</th>
                <th className="py-3 px-5">Win Rate</th>
                <th className="py-3 px-5">Profit Factor</th>
                <th className="py-3 px-5">Net Realized PNL</th>
                <th className="py-3 px-5">Assessment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {regimes.map((r) => {
                const isPos = r.net_pnl > 0;
                return (
                  <tr key={r.regime} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-5 font-sans font-bold text-slate-900 dark:text-white">{r.regime}</td>
                    <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">{r.trades}</td>
                    <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">{r.win_rate}%</td>
                    <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">{r.profit_factor.toFixed(2)}</td>
                    <td className={`py-3.5 px-5 font-bold tabular-nums ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {isPos ? '+' : ''}${r.net_pnl.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-5 font-sans">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          r.win_rate >= 55 && r.net_pnl > 0
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                            : r.net_pnl < 0
                            ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {r.win_rate >= 55 && r.net_pnl > 0
                          ? 'Optimal Strategy Fit'
                          : r.net_pnl < 0
                          ? 'Unfavorable / Bleed'
                          : 'Neutral'}
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
