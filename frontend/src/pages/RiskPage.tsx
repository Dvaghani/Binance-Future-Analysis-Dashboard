import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Scale,
  Percent,
  TrendingDown,
  Info,
  DollarSign,
  Activity,
} from 'lucide-react';
import { api } from '../services/api';
import { RiskData } from '../types';
import { formatFee, formatCurrency, formatPNL } from '../utils/format';

export const RiskPage: React.FC = () => {
  const [data, setData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRisk();
  }, []);

  const loadRisk = async () => {
    try {
      const res = await api.getRisk();
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

  const { score_breakdown } = data;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Risk Score Hero Card */}
      <div className="card-white p-6 border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Transparent Risk & Health Assessment
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-4xl font-bold font-mono text-slate-900">{data.risk_score}</span>
              <span className="text-sm font-semibold text-slate-400">/ 100</span>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                  data.risk_score >= 80
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : data.risk_score >= 65
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {data.risk_tier}
              </span>
            </div>
          </div>

          <div className="max-w-md text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-800 block mb-0.5">Methodology Transparency</span>
            The 0–100 score is computed deterministically across 5 quantitative risk factors without arbitrary weights. Each component tracks live account metrics against prudent institutional risk limits.
          </div>
        </div>

        {/* 5 Weighted Components Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-6">
          {/* Factor 1: Drawdown Health */}
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-semibold text-slate-700">Drawdown</span>
              <span className="text-xs font-mono font-bold text-slate-900">
                {score_breakdown.drawdown_health.score} / {score_breakdown.drawdown_health.max}
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-2">
              <div
                className="bg-emerald-600 h-full rounded-full"
                style={{ width: `${(score_breakdown.drawdown_health.score / score_breakdown.drawdown_health.max) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block font-mono">{score_breakdown.drawdown_health.metric}</span>
          </div>

          {/* Factor 2: Leverage Discipline */}
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-semibold text-slate-700">Leverage</span>
              <span className="text-xs font-mono font-bold text-slate-900">
                {score_breakdown.leverage_discipline.score} / {score_breakdown.leverage_discipline.max}
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-2">
              <div
                className="bg-emerald-600 h-full rounded-full"
                style={{ width: `${(score_breakdown.leverage_discipline.score / score_breakdown.leverage_discipline.max) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block font-mono">{score_breakdown.leverage_discipline.metric}</span>
          </div>

          {/* Factor 3: Position Concentration */}
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-semibold text-slate-700">Concentration</span>
              <span className="text-xs font-mono font-bold text-slate-900">
                {score_breakdown.position_concentration.score} / {score_breakdown.position_concentration.max}
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-2">
              <div
                className="bg-emerald-600 h-full rounded-full"
                style={{ width: `${(score_breakdown.position_concentration.score / score_breakdown.position_concentration.max) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block font-mono">{score_breakdown.position_concentration.metric}</span>
          </div>

          {/* Factor 4: Behavioral Discipline */}
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-semibold text-slate-700">Execution Flaws</span>
              <span className="text-xs font-mono font-bold text-slate-900">
                {score_breakdown.behavioral_discipline.score} / {score_breakdown.behavioral_discipline.max}
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-2">
              <div
                className="bg-emerald-600 h-full rounded-full"
                style={{ width: `${(score_breakdown.behavioral_discipline.score / score_breakdown.behavioral_discipline.max) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block font-mono">{score_breakdown.behavioral_discipline.metric}</span>
          </div>

          {/* Factor 5: Expectancy */}
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-semibold text-slate-700">Edge Quality</span>
              <span className="text-xs font-mono font-bold text-slate-900">
                {score_breakdown.expectancy_quality.score} / {score_breakdown.expectancy_quality.max}
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-2">
              <div
                className="bg-emerald-600 h-full rounded-full"
                style={{ width: `${(score_breakdown.expectancy_quality.score / score_breakdown.expectancy_quality.max) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block font-mono">{score_breakdown.expectancy_quality.metric}</span>
          </div>
        </div>
      </div>

      {/* Primary Risk Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="card-white p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Maximum Drawdown
          </span>
          <div className="text-lg font-bold font-mono text-rose-600 mt-1">
            -{data.max_drawdown_pct}%
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            ${data.max_drawdown.toFixed(2)} historical peak drop
          </span>
        </div>

        <div className="card-white p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Current Drawdown
          </span>
          <div className="text-lg font-bold font-mono text-slate-900 mt-1">
            -{data.current_drawdown_pct}%
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            ${data.current_drawdown.toFixed(2)} below peak
          </span>
        </div>

        <div className="card-white p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Worst Single Day Loss
          </span>
          <div className="text-lg font-bold font-mono text-rose-600 mt-1">
            -${data.worst_daily_loss.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Single session loss limit</span>
        </div>

        <div className="card-white p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Position Concentration
          </span>
          <div className="text-lg font-bold font-mono text-slate-900 mt-1">
            {data.position_concentration_pct}%
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Largest trade / total balance</span>
        </div>

        <div className="card-white p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Average Leverage Used
          </span>
          <div className="text-lg font-bold font-mono text-slate-900 mt-1">
            {data.avg_leverage}x
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Peak leverage reached: {data.max_leverage}x</span>
        </div>

        <div className="card-white p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Largest Position Taken
          </span>
          <div className="text-lg font-bold font-mono text-slate-900 mt-1">
            ${data.largest_position.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Max notional capital exposure</span>
        </div>

        <div className="card-white p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Cumulative Trading Fees
          </span>
          <div className="text-lg font-bold font-mono text-rose-600 mt-1">
            -{formatFee(data.total_fees)}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Exchange commissions paid</span>
        </div>

        <div className="card-white p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Net Funding Paid
          </span>
          <div className={`text-lg font-bold font-mono mt-1 ${data.total_funding >= 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
            {data.total_funding >= 0 ? '+' : ''}{formatFee(data.total_funding)}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Perpetual funding transfer impact</span>
        </div>
      </div>
    </div>
  );
};
