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
import { Clock, Calendar, Globe, Sparkles, Sun, Moon, Flame } from 'lucide-react';
import { api } from '../services/api';
import { TimeAnalysisData, HourlyItem, DailyItem, SessionItem } from '../types';

export const TimeAnalysisPage: React.FC = () => {
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
    return <div className="p-8 animate-pulse space-y-6"><div className="h-72 bg-slate-200/60 rounded-xl" /></div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Best / Worst Window Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-white p-5 border-emerald-200/80 bg-emerald-50/20 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
              Optimal Trading Window (UTC)
            </span>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {data.best_window}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Your highest expectancy and cleanest setups occur during this time bracket.
            </p>
          </div>
        </div>

        <div className="card-white p-5 border-rose-200/80 bg-rose-50/20 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider block">
              High-Risk Time Window (UTC)
            </span>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {data.worst_window}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Statistically your most loss-prone window. Protect capital by stepping away or avoiding fresh entries.
            </p>
          </div>
        </div>
      </div>

      {/* 24-Hour PNL Distribution Bar Chart */}
      <div className="card-white p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-1">24-Hour Performance (UTC)</h3>
        <p className="text-xs text-slate-400 mb-4">Hourly realized PNL across all executed trades</p>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.hourly} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d: HourlyItem = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-200 shadow-hover p-3 rounded-lg text-xs space-y-1">
                        <div className="font-bold text-slate-900">{d.label} UTC</div>
                        <div className={`font-semibold font-mono ${d.net_pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          Net PNL: {d.net_pnl >= 0 ? '+' : ''}${d.net_pnl.toFixed(2)}
                        </div>
                        <div className="text-slate-500">Trades: {d.trades}</div>
                        <div className="text-slate-500">Win Rate: {d.win_rate}%</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="net_pnl" radius={[4, 4, 0, 0]}>
                {data.hourly.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.net_pnl >= 0 ? '#059669' : '#E11D48'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Day of Week & Trading Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Day of Week Table */}
        <div className="card-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Day of the Week Distribution</h3>
          </div>

          <div className="space-y-2.5">
            {data.daily.map((d) => (
              <div key={d.day} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 text-xs">
                <span className="font-medium text-slate-800">{d.day}</span>
                <div className="flex items-center gap-4">
                  <span className="text-slate-400 font-mono text-[11px]">{d.trades} trades</span>
                  <span className="text-slate-600 font-mono text-[11px]">{d.win_rate}% WR</span>
                  <span
                    className={`font-mono font-bold w-20 text-right ${
                      d.net_pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {d.net_pnl >= 0 ? '+' : ''}${d.net_pnl.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Major Sessions Breakdown */}
        <div className="card-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Global Trading Sessions</h3>
          </div>

          <div className="space-y-3">
            {data.sessions.map((s) => (
              <div key={s.session} className="p-3.5 border border-slate-100 rounded-lg bg-white shadow-subtle">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-900 text-xs">{s.session} Session</span>
                  <span
                    className={`font-mono font-bold text-xs ${
                      s.net_pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {s.net_pnl >= 0 ? '+' : ''}${s.net_pnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>{s.trades} Trades</span>
                  <span>Win Rate: {s.win_rate}%</span>
                  <span>PF: {s.profit_factor.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
