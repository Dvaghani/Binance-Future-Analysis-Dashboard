import React, { useEffect, useState } from 'react';
import {
  Printer,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  Award,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { api } from '../services/api';
import { FullReportData } from '../types';
import { formatFee, formatCurrency, formatPNL } from '../utils/format';

export const ReportsPage: React.FC = () => {
  const [report, setReport] = useState<FullReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      const res = await api.getReport();
      setReport(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !report) {
    return <div className="p-8 animate-pulse space-y-6"><div className="h-96 bg-slate-200/60 rounded-xl" /></div>;
  }

  const { overall_performance: kpis, long_vs_short: ls, risk_summary: risk, fees_funding: fees } = report;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Top Export Bar (Hidden on Print) */}
      <div className="card-white p-4 flex items-center justify-between no-print">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Trading Intelligence Audit Report</h2>
          <p className="text-xs text-slate-400">Generated {report.generated_at}</p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition"
        >
          <Printer className="w-4 h-4" />
          <span>Export / Print to PDF</span>
        </button>
      </div>

      {/* Printable Report Document Body */}
      <div className="card-white p-8 space-y-8 bg-white print:p-0 print:border-none print:shadow-none">
        {/* Document Header */}
        <div className="border-b border-slate-200 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block">
                Official Account Audit
              </span>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">
                Personal Binance Futures Trading Report
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Comprehensive evaluation of profitability, directional bias, psychology, and risk exposure.
              </p>
            </div>
            <div className="text-right text-xs font-mono text-slate-500">
              <div>Date: {report.generated_at}</div>
              <div className="text-emerald-600 font-semibold font-sans mt-0.5">Verified Read-Only</div>
            </div>
          </div>
        </div>

        {/* Section 1 & 2: Overall Performance & PNL Overview */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            1 & 2. Overall Performance & PNL Overview
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-500 font-sans block">Total Net Realized PNL</span>
              <span className={`text-base font-bold ${kpis.net_pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatPNL(kpis.net_pnl, 2)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-500 font-sans block">Win Rate</span>
              <span className="text-base font-bold text-slate-900">{kpis.win_rate}%</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-500 font-sans block">Profit Factor</span>
              <span className="text-base font-bold text-slate-900">{kpis.profit_factor.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-500 font-sans block">Account ROI</span>
              <span className="text-base font-bold text-emerald-600">+{kpis.roi_pct}%</span>
            </div>
          </div>
        </div>

        {/* Section 4: Long vs Short Directional Edge */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            4. Long vs Short Directional Edge
          </h3>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg mb-3 text-xs font-medium text-slate-800">
            {ls.insight}
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3.5 border border-slate-200 rounded-lg">
              <span className="font-bold font-sans text-slate-900 block mb-2">LONG Performance</span>
              <div className="space-y-1">
                <div className="flex justify-between"><span>PNL:</span><span className="font-bold text-emerald-600">{formatPNL(ls.long.pnl, 2)}</span></div>
                <div className="flex justify-between"><span>Win Rate:</span><span>{ls.long.win_rate}%</span></div>
                <div className="flex justify-between"><span>Profit Factor:</span><span>{ls.long.profit_factor.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Avg Winner:</span><span>{formatPNL(ls.long.avg_winner, 2)}</span></div>
                <div className="flex justify-between"><span>Avg Loser:</span><span>{formatPNL(-Math.abs(ls.long.avg_loser), 2)}</span></div>
              </div>
            </div>
            <div className="p-3.5 border border-slate-200 rounded-lg">
              <span className="font-bold font-sans text-slate-900 block mb-2">SHORT Performance</span>
              <div className="space-y-1">
                <div className="flex justify-between"><span>PNL:</span><span className="font-bold text-rose-600">{formatPNL(ls.short.pnl, 2)}</span></div>
                <div className="flex justify-between"><span>Win Rate:</span><span>{ls.short.win_rate}%</span></div>
                <div className="flex justify-between"><span>Profit Factor:</span><span>{ls.short.profit_factor.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Avg Winner:</span><span>{formatPNL(ls.short.avg_winner, 2)}</span></div>
                <div className="flex justify-between"><span>Avg Loser:</span><span>{formatPNL(-Math.abs(ls.short.avg_loser), 2)}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Asset Breakdown */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            5. Asset Breakdown (Key Drivers vs Draggers)
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs font-mono mb-3">
            {report.asset_performance.top_driver && (
              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg">
                <span className="text-[10px] font-sans font-semibold text-emerald-800 uppercase block">Top Profit Driver</span>
                <div className="text-sm font-bold font-sans text-slate-900 mt-1">{report.asset_performance.top_driver.symbol}</div>
                <div className="text-emerald-600 font-bold mt-0.5">{formatPNL(report.asset_performance.top_driver.net_pnl, 2)} ({report.asset_performance.top_driver.win_rate}% WR)</div>
              </div>
            )}
            {report.asset_performance.top_dragger && (
              <div className="p-3 bg-rose-50/50 border border-rose-200 rounded-lg">
                <span className="text-[10px] font-sans font-semibold text-rose-800 uppercase block">Top Performance Drag</span>
                <div className="text-sm font-bold font-sans text-slate-900 mt-1">{report.asset_performance.top_dragger.symbol}</div>
                <div className="text-rose-600 font-bold mt-0.5">{formatPNL(report.asset_performance.top_dragger.net_pnl, 2)} ({report.asset_performance.top_dragger.win_rate}% WR)</div>
              </div>
            )}
          </div>
        </div>

        {/* Section 6 & 7: Risk & Drawdown */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            6 & 7. Risk & Drawdown Assessment
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-500 font-sans block">Overall Risk Score</span>
              <span className="text-base font-bold text-slate-900">{risk.risk_score} / 100</span>
              <span className="text-[10px] text-emerald-600 font-sans block mt-0.5">{risk.risk_tier}</span>
            </div>
            <div className="p-3 border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-500 font-sans block">Maximum Drawdown</span>
              <span className="text-base font-bold text-rose-600">-{risk.max_drawdown_pct}%</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">${risk.max_drawdown.toFixed(2)} drop</span>
            </div>
            <div className="p-3 border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-500 font-sans block">Average Leverage</span>
              <span className="text-base font-bold text-slate-900">{risk.avg_leverage}x</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Max used: {risk.max_leverage}x</span>
            </div>
            <div className="p-3 border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-500 font-sans block">Max Position Size</span>
              <span className="text-base font-bold text-slate-900">${risk.largest_position.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{risk.position_concentration_pct}% of balance</span>
            </div>
          </div>
        </div>

        {/* Section 8: Behavioral Flaw Audit */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            8. Trading Behavior & Flaw Audit
          </h3>
          <div className="space-y-2 text-xs">
            {report.trading_behavior.behaviors.map((b) => (
              <div key={b.key} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900">{b.title}</span>
                  <p className="text-[11px] text-slate-500">{b.description}</p>
                </div>
                <div className="text-right font-mono shrink-0 pl-4">
                  <span className="text-slate-800 font-bold block">{b.count} events</span>
                  <span className="text-rose-600 text-[11px]">{b.cost > 0 ? `-${formatFee(b.cost)}` : '$0'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 10: Fees and Funding Drag */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            10. Fees and Funding Drag
          </h3>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono space-y-1.5">
            <div className="flex justify-between"><span>Gross Realized PNL:</span><span className="font-bold text-slate-900">${fees.gross_pnl.toFixed(2)}</span></div>
            <div className="flex justify-between text-rose-600"><span>Trading Commissions Paid:</span><span>-{formatFee(fees.total_fees)} ({fees.fees_pct_gross}% of gross)</span></div>
            <div className="flex justify-between text-slate-600"><span>Net Funding Transfers:</span><span>{fees.net_funding >= 0 ? '+' : ''}{formatFee(fees.net_funding)}</span></div>
            <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900">
              <span>Net Realized PNL:</span><span>${fees.net_pnl.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Section 11, 12, 13: Strengths, Weaknesses, and Actionable Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Strengths */}
          <div className="p-4 bg-emerald-50/40 border border-emerald-200 rounded-lg text-xs">
            <span className="font-bold text-emerald-900 flex items-center gap-1.5 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              11. Key Strengths
            </span>
            <ul className="space-y-1.5 text-emerald-950">
              {report.strengths.map((s, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Weaknesses */}
          <div className="p-4 bg-rose-50/40 border border-rose-200 rounded-lg text-xs">
            <span className="font-bold text-rose-900 flex items-center gap-1.5 mb-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              12. Key Weaknesses
            </span>
            <ul className="space-y-1.5 text-rose-950">
              {report.weaknesses.map((w, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actionable Improvements */}
          <div className="p-4 bg-indigo-50/40 border border-indigo-200 rounded-lg text-xs">
            <span className="font-bold text-indigo-900 flex items-center gap-1.5 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              13. Actionable Rules
            </span>
            <ul className="space-y-1.5 text-indigo-950">
              {report.actionable_improvements.map((a, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-indigo-500 font-bold">•</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
