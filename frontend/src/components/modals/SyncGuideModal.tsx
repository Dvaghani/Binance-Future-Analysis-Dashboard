import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Calendar,
  Layers,
  FileSpreadsheet,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Clock,
  Zap,
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export const SyncGuideModal: React.FC = () => {
  const { isSyncGuideOpen, setIsSyncGuideOpen, lookbackDays, setLookbackDays, syncNow, isSyncing } = useTrading();
  const [activeTab, setActiveTab] = useState<'limits' | 'deepsync' | 'csv' | 'faq'>('limits');

  if (!isSyncGuideOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Binance Futures Sync & History Guide</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Understanding API limits, 90-day Deep Sync, and lifetime history
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSyncGuideOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 flex border-b border-slate-100 dark:border-slate-800 gap-2 shrink-0 bg-slate-50/30 dark:bg-slate-900/30">
          <button
            onClick={() => setActiveTab('limits')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'limits'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Why Recent Only?</span>
          </button>
          <button
            onClick={() => setActiveTab('deepsync')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'deepsync'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>90-Day Deep Sync</span>
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'csv'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exporting &gt; 90 Days</span>
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'faq'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Safety & FAQ</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4 text-xs leading-relaxed">
          {activeTab === 'limits' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <div className="font-bold text-sm mb-1">Official Binance Futures REST API Restrictions</div>
                  Binance imposes two strict server-side rules on historical trade execution queries that determine what data can be downloaded via API:
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold mb-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>Rule 1: 7-Day Window Maximum</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    Binance’s execution endpoint (<code>GET /fapi/v1/userTrades</code>) rejects any single query where <code>endTime - startTime &gt; 7 days</code>. If no time range is specified, Binance returns only the most recent 7 days of trade executions.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold mb-1.5">
                    <Clock className="w-4 h-4" />
                    <span>Rule 2: 90-Day Hard Archive Cutoff</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    Binance moves all trade records older than <strong>90 days (3 months)</strong> to a cold archive. Live REST API keys cannot query data prior to 90 days ago. Older lifetime history must be exported via Binance Web CSV export.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-500" />
                  <span>How Our Platform Solves This</span>
                </h4>
                <p className="text-slate-600 dark:text-slate-300">
                  Rather than making a single basic call, our dashboard implements an automated <strong>7-Day Sliding Window Chunking Engine</strong>. When you select 30, 60, or 90 days, the backend automatically calculates consecutive 7-day batches, iterates through Binance’s API, and reconstructs your full trading history.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'deepsync' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200">
                <div className="font-bold text-sm mb-1 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Choose Your Historical Sync Period</span>
                </div>
                Select how far back you want to sync your live trade executions and funding fees right now:
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {[
                  { days: 7, label: '7 Days', desc: 'Fastest sync, recent week of scalp & swing trades' },
                  { days: 30, label: '30 Days', desc: 'Default lookback, full past month performance' },
                  { days: 60, label: '60 Days', desc: 'Past 2 months of round-trip positions and fees' },
                  { days: 90, label: '90 Days', desc: 'Maximum live API limit permitted by Binance' },
                ].map((item) => (
                  <button
                    key={item.days}
                    type="button"
                    onClick={() => setLookbackDays(item.days)}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      lookbackDays === item.days
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                        <span>{item.label}</span>
                        {lookbackDays === item.days && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        {item.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Sync Active Live Account Now</div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Will query Binance using {Math.ceil(lookbackDays / 7)} consecutive 7-day windows covering the last {lookbackDays} days.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    syncNow(lookbackDays);
                    setIsSyncGuideOpen(false);
                  }}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Start {lookbackDays}D Sync</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'csv' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200">
                <div className="font-bold text-sm mb-1">How to Access Trade History Older Than 90 Days</div>
                Because Binance's live API restricts REST access beyond 90 days, follow these official steps on the Binance web portal to export your entire lifetime history:
              </div>

              <div className="space-y-3">
                {[
                  {
                    step: '1',
                    title: 'Go to Binance Futures Orders',
                    desc: 'Log in to Binance.com on desktop, go to Futures -> USD(S)-M Futures, then click Orders (top right) -> Futures Orders.',
                  },
                  {
                    step: '2',
                    title: 'Select Trade History',
                    desc: 'In the left sidebar menu under Futures Orders, click on "Trade History".',
                  },
                  {
                    step: '3',
                    title: 'Click "Export" in the Top Right',
                    desc: 'Above the trade table, click the "Export" button located next to the date filter.',
                  },
                  {
                    step: '4',
                    title: 'Choose "Export Complete History (Beyond 3 Months)"',
                    desc: 'Select the custom date range covering your desired months or years (up to lifetime). Click "Generate".',
                  },
                  {
                    step: '5',
                    title: 'Download the Generated CSV / ZIP',
                    desc: 'Binance will generate the file within 2–5 minutes. Click "Download" to retrieve your complete raw execution log.',
                  },
                ].map((s) => (
                  <div key={s.step} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-3 bg-white dark:bg-slate-800/30">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
                      {s.step}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{s.title}</div>
                      <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/30">
                <div className="font-bold text-slate-900 dark:text-white mb-1">
                  Does syncing longer periods duplicate my trades?
                </div>
                <div className="text-slate-600 dark:text-slate-300">
                  <strong>No.</strong> Every trade fill and income record is stored with a deterministic unique composite key (e.g., <code>acc1_fill_12345678</code>). Repeated syncs simply verify existing data and only insert new executions.
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/30">
                <div className="font-bold text-slate-900 dark:text-white mb-1">
                  Will syncing multiple 7-day windows hit Binance rate limits?
                </div>
                <div className="text-slate-600 dark:text-slate-300">
                  <strong>No.</strong> Binance allows up to 2,400 request weight per minute for authenticated endpoints. A full 90-day sync consumes under 80 weight units total, well within 3% of the limit.
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/30">
                <div className="font-bold text-slate-900 dark:text-white mb-1">
                  Can this platform place trades or touch my funds?
                </div>
                <div className="text-slate-600 dark:text-slate-300">
                  <strong>Never.</strong> The backend contains exclusively read-only endpoints (<code>/fapi/v1/userTrades</code>, <code>/fapi/v1/income</code>, <code>/fapi/v2/account</code>). No order placement or withdrawal code exists in the codebase.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Read-Only Binance Futures API Integration</span>
          </div>
          <button
            type="button"
            onClick={() => setIsSyncGuideOpen(false)}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
