import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Maximize2,
  Minimize2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Clock,
  Coins,
  Receipt,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Sparkles,
  Info
} from 'lucide-react';
import { api } from '../../services/api';
import { TradeChartData } from '../../types';
import { formatCurrency, formatFee, formatPNL } from '../../utils/format';
import { TradeCandlestickChart } from '../charts/TradeCandlestickChart';

interface TradeChartModalProps {
  tradeId: string | null;
  onClose: () => void;
}

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h'] as const;

export const TradeChartModal: React.FC<TradeChartModalProps> = ({ tradeId, onClose }) => {
  const [chartData, setChartData] = useState<TradeChartData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Fetch chart data
  const loadChart = useCallback(
    async (id: string, interval?: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getTradeChart(id, interval);
        setChartData(data);
        if (!interval) {
          setSelectedInterval(data.interval);
        }
      } catch (err: any) {
        console.error('Failed to load trade chart:', err);
        setError(err.message || 'Unable to load trade candlestick chart data');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (tradeId) {
      setSelectedInterval(null);
      loadChart(tradeId);
    } else {
      setChartData(null);
    }
  }, [tradeId, loadChart]);

  // Handle interval switch
  const handleIntervalChange = (newInterval: string) => {
    if (newInterval === selectedInterval || !tradeId) return;
    setSelectedInterval(newInterval);
    loadChart(tradeId, newInterval);
  };

  // Keyboard navigation (ESC to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    if (tradeId) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [tradeId, isFullscreen, onClose]);

  if (!tradeId) return null;

  const trade = chartData?.trade;
  const isLong = trade?.side === 'LONG';
  const isWin = trade ? trade.net_pnl > 0 : false;
  const totalFees = trade ? (trade.commission || 0) + Math.abs(Math.min(0, trade.funding_fees || 0)) : 0;
  const marginUsed = trade ? trade.position_value / (trade.leverage || 10) : 0;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fadeIn ${
        isFullscreen ? 'p-0' : 'p-2 sm:p-4'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-slate-100 transition-all duration-150 ${
          isFullscreen
            ? 'w-screen h-screen max-w-none max-h-none rounded-none border-0'
            : 'w-full max-w-5xl max-h-[92vh] rounded-2xl border border-slate-200 dark:border-slate-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Symbol & Direction Pill */}
            <div className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                  isLong
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400'
                    : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400'
                }`}
              >
                {isLong ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight font-sans">
                    {trade?.symbol || 'Trade'} {trade?.side}
                  </h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono border border-slate-200 dark:border-slate-700">
                    {trade?.leverage}x
                  </span>
                  {chartData?.source === 'binance' ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> Binance Live Klines
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      Chart Replay
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                  {trade?.entry_time} → {trade?.exit_time} ({trade?.duration_formatted})
                </p>
              </div>
            </div>
          </div>

          {/* Controls: Timeframe selector, Fullscreen, Close */}
          <div className="flex items-center gap-2">
            {/* Timeframe selector pills */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  onClick={() => handleIntervalChange(tf)}
                  disabled={loading}
                  className={`px-2 py-1 text-[11px] font-semibold rounded-md transition ${
                    selectedInterval === tf
                      ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading && !chartData ? (
            <div className="h-80 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-xs text-slate-400 font-mono">Synchronizing trade price action & markers...</p>
            </div>
          ) : error ? (
            <div className="h-72 flex flex-col items-center justify-center p-6 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600">
                <XCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Unable to load chart</h4>
              <p className="text-xs text-slate-400 max-w-sm">{error}</p>
              <button
                onClick={() => tradeId && loadChart(tradeId, selectedInterval || undefined)}
                className="mt-2 px-3 py-1.5 text-xs font-semibold bg-slate-900 dark:bg-slate-800 text-white rounded-lg hover:bg-slate-800 shadow-sm"
              >
                Retry
              </button>
            </div>
          ) : chartData && trade ? (
            <>
              {/* CLEAN EXECUTION HUD / STATS BANNER */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. Net PNL Card */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Realized Net PnL
                  </span>
                  <div className="mt-1">
                    <span
                      className={`text-xl font-bold font-mono ${
                        isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatPNL(trade.net_pnl, 2)}
                    </span>
                    <span
                      className={`text-xs font-semibold ml-2 font-mono ${
                        trade.pnl_percentage >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {trade.pnl_percentage >= 0 ? '+' : ''}{trade.pnl_percentage.toFixed(2)}%
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Gross: {formatPNL(trade.gross_pnl, 2)}
                  </span>
                </div>

                {/* 2. Entry Price Level */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Execution Entry
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                      ${trade.entry_price.toLocaleString()}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1 rounded ${
                        isLong
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {trade.side}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono truncate">{trade.entry_time}</span>
                </div>

                {/* 3. Exit Price Level */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Execution Exit
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                      ${trade.exit_price.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold px-1 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                      CLOSE
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono truncate">{trade.exit_time}</span>
                </div>

                {/* 4. Itemized Fees & Friction */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Itemized Fees & Funding
                  </span>
                  <div className="mt-1 text-xs font-mono space-y-0.5">
                    <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 font-medium">
                      <span>Fee (Comm):</span>
                      <span className="font-bold">-{formatFee(trade.commission)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Funding:</span>
                      <span
                        className={`font-semibold ${
                          trade.funding_fees >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {trade.funding_fees >= 0 ? '+' : ''}{formatFee(trade.funding_fees)}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Total Drag: -{formatFee(totalFees)}
                  </span>
                </div>
              </div>

              {/* BEHAVIORAL WARNING (If flagged) */}
              {trade.behavioral_flags.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <span className="font-bold text-amber-900 dark:text-amber-200">
                        Behavioral Flaw Flagged:
                      </span>{' '}
                      <span className="text-amber-800 dark:text-amber-300 font-medium">
                        {trade.behavioral_flags.join(', ').replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded font-bold">
                    Review Required
                  </span>
                </div>
              )}

              {/* CANDLESTICK CHART CANVAS */}
              <div className={`p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-all ${isFullscreen ? 'shadow-lg' : ''}`}>
                <TradeCandlestickChart
                  trade={trade}
                  candles={chartData.candles}
                  entryIndex={chartData.entry_index}
                  exitIndex={chartData.exit_index}
                  minPrice={chartData.min_price}
                  maxPrice={chartData.max_price}
                  mfe={chartData.mfe}
                  mae={chartData.mae}
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
                />
              </div>

              {/* ITEMIZATION DETAILS & POSITION SUMMARY */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                {/* Sizing Details */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-bold font-sans text-xs mb-1">
                    <Coins className="w-3.5 h-3.5 text-slate-400" />
                    Position Sizing
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Position Notional:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      ${trade.position_value.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Margin Committed:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      ${marginUsed.toFixed(2)} ({trade.leverage}x)
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Quantity Traded:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{trade.quantity}</span>
                  </div>
                </div>

                {/* Performance Spread */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-bold font-sans text-xs mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                    Execution Spread
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Price Delta:</span>
                    <span
                      className={`font-semibold ${
                        isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {((trade.exit_price - trade.entry_price) / trade.entry_price * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Trade Duration:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {trade.duration_formatted}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Market Regime:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {trade.market_regime || 'Sideways'}
                    </span>
                  </div>
                </div>

                {/* Friction Impact */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-bold font-sans text-xs mb-1">
                    <Receipt className="w-3.5 h-3.5 text-slate-400" />
                    Fee Friction Impact
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Fee as % of Gross:</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      {trade.gross_pnl !== 0
                        ? `${Math.abs((trade.commission / trade.gross_pnl) * 100).toFixed(1)}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Net vs Gross Delta:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      -${(trade.gross_pnl - trade.net_pnl).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Outcome Status:</span>
                    <span
                      className={`font-bold ${
                        isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isWin ? 'WINNER' : 'LOSER'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
};
