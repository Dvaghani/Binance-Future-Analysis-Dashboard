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
import { OverviewData, EquityPoint } from '../types';
import { useTrading } from '../context/TradingContext';

export const OverviewPage: React.FC = () => {
  const { setActiveTab } = useTrading();
  const [data, setData] = useState<OverviewData | null>(null);
  const [equityData, setEquityData] = useState<EquityPoint[]>([]);
  const [timeframe, setTimeframe] = useState<string>('30D');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadEquity();
  }, [timeframe]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getOverview();
      setData(res);
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
            <div key={i} className="h-24 bg-slate-200/60 rounded-xl" />
          ))}
        </div>
        <div className="h-80 bg-slate-200/60 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Backend Connection Error</h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          {error || 'Unable to connect to the trading backend server.'}
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono text-slate-700 text-left max-w-md mx-auto">
          <div>$ python -m backend.main</div>
          <div className="text-slate-400 mt-1"># Starts FastAPI at http://127.0.0.1:8000</div>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Connection
        </button>
      </div>
    );
  }

  const kpis = data.kpis;
  const isNetPositive = kpis.net_pnl >= 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Trajectory Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
          kpis.trajectory === 'improving'
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : kpis.trajectory === 'degrading'
            ? 'bg-rose-50/70 border-rose-200 text-rose-950'
            : 'bg-slate-50 border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              kpis.trajectory === 'improving'
                ? 'bg-emerald-100 text-emerald-700'
                : kpis.trajectory === 'degrading'
                ? 'bg-rose-100 text-rose-700'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {kpis.trajectory === 'improving' ? (
              <TrendingUp className="w-5 h-5" />
            ) : kpis.trajectory === 'degrading' ? (
              <TrendingDown className="w-5 h-5" />
            ) : (
              <Activity className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Trading Trajectory Assessment
            </div>
            <div className="text-sm font-bold flex items-center gap-1.5 mt-0.5">
              <span>
                {kpis.trajectory === 'improving'
                  ? 'Trading Performance is Improving'
                  : kpis.trajectory === 'degrading'
                  ? 'Caution: Performance Degradation Detected'
                  : 'Trading Performance is Steady'}
              </span>
              <span className="text-xs font-normal opacity-80">
                (7D pace: {kpis.seven_day_pnl >= 0 ? '+' : ''}${(kpis.seven_day_pnl / 7).toFixed(1)}/day vs 30D pace: {kpis.thirty_day_pnl >= 0 ? '+' : ''}${(kpis.thirty_day_pnl / 30).toFixed(1)}/day)
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('performance')}
          className="text-xs font-semibold flex items-center gap-1 hover:underline text-slate-700 shrink-0"
        >
          <span>View Detailed Breakdown</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Balance & Equity */}
        <div className="card-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Wallet Balance
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Futures</span>
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums font-mono">
            ${kpis.current_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between font-mono">
            <span>Equity:</span>
            <span className="font-semibold text-slate-800">
              ${(kpis.equity ?? kpis.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Net PNL */}
        <div className="card-white p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Net PNL
          </span>
          <div
            className={`text-lg font-bold mt-1 tabular-nums font-mono flex items-center gap-0.5 ${
              isNetPositive ? 'text-emerald-600' : 'text-rose-600'
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
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Win Rate
          </span>
          <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums font-mono">
            {kpis.win_rate}%
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {kpis.total_trades} Closed Trades
          </span>
        </div>

        {/* Profit Factor */}
        <div className="card-white p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Profit Factor
          </span>
          <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums font-mono">
            {kpis.profit_factor.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {kpis.profit_factor >= 1.5 ? 'Strong edge' : kpis.profit_factor >= 1.0 ? 'Breakeven edge' : 'Sub-optimal'}
          </span>
        </div>

        {/* Max Drawdown */}
        <div className="card-white p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Max Drawdown
          </span>
          <div className="text-lg font-bold text-rose-600 mt-1 tabular-nums font-mono">
            -{kpis.max_drawdown_pct}%
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            ${kpis.max_drawdown.toFixed(2)} peak-to-trough
          </span>
        </div>

        {/* 30D PNL */}
        <div className="card-white p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            30-Day PNL
          </span>
          <div
            className={`text-lg font-bold mt-1 tabular-nums font-mono ${
              kpis.thirty_day_pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {kpis.thirty_day_pnl >= 0 ? '+' : ''}${kpis.thirty_day_pnl.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Today: {kpis.today_pnl >= 0 ? '+' : ''}${kpis.today_pnl.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Equity Curve Chart Section */}
      <div className="card-white p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Account Equity & Cumulative PNL</h2>
            <p className="text-xs text-slate-400">Total cumulative net performance over time</p>
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

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equityData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis
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
                        <div
                          className={`font-semibold font-mono ${
                            d.cumulative_pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          Cum PNL: {d.cumulative_pnl >= 0 ? '+' : ''}${d.cumulative_pnl?.toFixed(2)}
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
                type="monotone"
                dataKey="equity"
                stroke="#059669"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#equityGrad)"
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
          className="card-white p-5 cursor-pointer hover:border-slate-300 transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Directional Edge
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
          </div>
          <p className="text-xs text-slate-700 font-medium leading-relaxed">
            {data.quick_insight}
          </p>
          <span className="text-[11px] font-semibold text-indigo-600 mt-3 block">
            Analyze Long vs Short Disparity →
          </span>
        </div>

        {/* Top Asset Driver & Dragger */}
        <div
          onClick={() => setActiveTab('assets')}
          className="card-white p-5 cursor-pointer hover:border-slate-300 transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              Asset Profitability
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
          </div>
          <div className="space-y-2">
            {data.top_asset && (
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">Top Driver: {data.top_asset.symbol}</span>
                <span className="font-mono font-bold text-emerald-600">
                  +${data.top_asset.net_pnl.toFixed(2)}
                </span>
              </div>
            )}
            {data.top_dragger && (
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">Top Dragger: {data.top_dragger.symbol}</span>
                <span className="font-mono font-bold text-rose-600">
                  -${Math.abs(data.top_dragger.net_pnl).toFixed(2)}
                </span>
              </div>
            )}
          </div>
          <span className="text-[11px] font-semibold text-amber-600 mt-3 block">
            Inspect All Traded Coins →
          </span>
        </div>

        {/* Risk & Behavior Score */}
        <div
          onClick={() => setActiveTab('risk')}
          className="card-white p-5 cursor-pointer hover:border-slate-300 transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Risk Health Score
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{data.risk_score}</span>
            <span className="text-xs text-slate-400">/ 100</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded ml-auto">
              {data.risk_tier}
            </span>
          </div>
          {data.top_behavior && (
            <p className="text-[11px] text-slate-500 mt-2">
              Behavior note: <span className="font-medium text-slate-700">{data.top_behavior.title}</span> ({data.top_behavior.count} incidents)
            </p>
          )}
          <span className="text-[11px] font-semibold text-emerald-600 mt-2 block">
            Inspect Risk Breakdown →
          </span>
        </div>
      </div>
    </div>
  );
};
