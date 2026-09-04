import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  X,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import { CalendarDay, TradeItem } from '../types';
import { formatPNL } from '../utils/format';

export const CalendarPage: React.FC = () => {
  const [days, setDays] = useState<Record<string, CalendarDay>>({});
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDayTrades, setSelectedDayTrades] = useState<{
    date: string;
    trades: TradeItem[];
    loading?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedDayTrades(null);
    };
    if (selectedDayTrades) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedDayTrades]);

  useEffect(() => {
    loadCalendar();
  }, []);

  const loadCalendar = async () => {
    try {
      const res = await api.getCalendar();
      const map: Record<string, CalendarDay> = {};
      res.days.forEach((d) => {
        map[d.date] = d;
      });
      setDays(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDayClick = async (dateStr: string) => {
    setSelectedDayTrades({ date: dateStr, trades: [], loading: true });
    try {
      const res = await api.getTrades({ date: dateStr, page_size: 200 });
      setSelectedDayTrades({ date: dateStr, trades: res.trades, loading: false });
    } catch (e) {
      console.error('Failed to load day trades:', e);
      setSelectedDayTrades({ date: dateStr, trades: [], loading: false });
    }
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = lastDay.getDate();

  const monthLabel = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  // Compute month totals
  let monthPnl = 0;
  let monthTrades = 0;
  let monthWins = 0;

  Object.values(days).forEach((d) => {
    if (d.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) {
      monthPnl += d.net_pnl;
      monthTrades += d.trades;
      if (d.is_winner) monthWins++;
    }
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Calendar Header Card */}
      <div className="card-white p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Trading Calendar Heatmap
          </span>
          <div className="flex items-center gap-3 mt-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{monthLabel}</h2>
            <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-800">
              <button
                onClick={prevMonth}
                className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Month Summary Stats */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
              Month Realized PNL
            </span>
            <span
              className={`text-base font-bold ${
                monthPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {monthPnl >= 0 ? '+' : ''}${monthPnl.toFixed(2)}
            </span>
          </div>

          <div className="border-l border-slate-200 dark:border-slate-700 pl-4 text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
              Month Trades
            </span>
            <span className="text-base font-bold text-slate-800 dark:text-slate-200">{monthTrades}</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card-white overflow-hidden p-4">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
          <div>Sun</div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {/* Empty cells before month start */}
          {[...Array(startDayOfWeek)].map((_, i) => (
            <div key={`empty-${i}`} className="h-24 bg-slate-50/50 dark:bg-slate-900/30 rounded-lg border border-transparent" />
          ))}

          {/* Month Days */}
          {[...Array(daysInMonth)].map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayData = days[dateStr];
            const hasTrades = !!dayData;
            const isPos = dayData?.net_pnl >= 0;

            return (
              <div
                key={dateStr}
                onClick={() => handleDayClick(dateStr)}
                className={`h-24 p-2.5 rounded-lg border transition-all flex flex-col justify-between ${
                  hasTrades
                    ? isPos
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-subtle cursor-pointer'
                      : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60 hover:border-rose-300 dark:hover:border-rose-600 hover:shadow-subtle cursor-pointer'
                    : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{dayNum}</span>
                  {hasTrades && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {dayData.trades} {dayData.trades === 1 ? 'trade' : 'trades'}
                    </span>
                  )}
                </div>

                {hasTrades ? (
                  <div className="space-y-0.5">
                    <div
                      className={`text-xs font-bold font-mono ${
                        isPos ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {isPos ? '+' : ''}${dayData.net_pnl.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      WR: {dayData.win_rate}%
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-300 dark:text-slate-600 italic">No trades</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Trades Modal */}
      {selectedDayTrades &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
            onClick={() => setSelectedDayTrades(null)}
          >
            <div
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[85vh] flex flex-col text-slate-900 dark:text-slate-100 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Trades on {selectedDayTrades.date}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-400 font-mono mt-0.5">
                    {selectedDayTrades.loading
                      ? 'Loading executions...'
                      : `${selectedDayTrades.trades.length} execution${selectedDayTrades.trades.length === 1 ? '' : 's'}`}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDayTrades(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Day Summary Bar (if trades loaded and not empty) */}
              {!selectedDayTrades.loading && selectedDayTrades.trades.length > 0 && (() => {
                const trades = selectedDayTrades.trades;
                const totalPnl = trades.reduce((acc, t) => acc + (t.net_pnl || 0), 0);
                const wins = trades.filter((t) => (t.net_pnl || 0) > 0).length;
                const losses = trades.filter((t) => (t.net_pnl || 0) <= 0).length;
                const winRate = ((wins / trades.length) * 100).toFixed(1);
                const isPos = totalPnl >= 0;

                return (
                  <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 grid grid-cols-4 gap-3 text-center text-xs font-mono">
                    <div className="p-2 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200/60 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block font-sans">Net PNL</span>
                      <span className={`font-bold text-sm ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatPNL(totalPnl, 2)}
                      </span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200/60 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block font-sans">Win Rate</span>
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{winRate}%</span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200/60 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block font-sans">W / L</span>
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                        <span className="text-emerald-600 dark:text-emerald-400">{wins}W</span> / <span className="text-rose-600 dark:text-rose-400">{losses}L</span>
                      </span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200/60 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block font-sans">Trades</span>
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{trades.length}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Modal Content / Trades List */}
              <div className="p-6 overflow-y-auto space-y-2.5 flex-1">
                {selectedDayTrades.loading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Loading trades for {selectedDayTrades.date}...
                    </p>
                  </div>
                ) : selectedDayTrades.trades.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No executions found</p>
                    <p className="text-xs text-slate-400 mt-1">There were no trades recorded on this date.</p>
                  </div>
                ) : (
                  selectedDayTrades.trades.map((t) => {
                    const isWin = t.net_pnl > 0;
                    return (
                      <div
                        key={t.id}
                        className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg flex items-center justify-between text-xs font-mono hover:border-slate-300 dark:hover:border-slate-600 transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white font-sans">{t.symbol}</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-sans ${
                                t.side === 'LONG'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60'
                              }`}
                            >
                              {t.side}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold">{t.leverage}x</span>
                            {t.market_regime && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-sans">
                                {t.market_regime}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-400 flex items-center gap-2">
                            <span>Entry: ${t.entry_price?.toLocaleString()}</span>
                            <span>→</span>
                            <span>Exit: ${t.exit_price?.toLocaleString()}</span>
                            {t.duration_formatted && (
                              <span className="text-slate-500 dark:text-slate-400">({t.duration_formatted})</span>
                            )}
                          </div>
                          {t.behavioral_flags && t.behavioral_flags.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {t.behavioral_flags.map((flag, idx) => (
                                <span
                                  key={idx}
                                  className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 font-sans uppercase font-medium"
                                >
                                  {flag.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="text-right pl-4">
                          <div
                            className={`font-bold text-sm ${
                              isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {formatPNL(t.net_pnl, 2)}
                          </div>
                          {t.pnl_percentage !== undefined && (
                            <div className={`text-[10px] ${isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {t.pnl_percentage >= 0 ? '+' : ''}{t.pnl_percentage.toFixed(2)}%
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {t.exit_time?.includes(' ') ? t.exit_time.split(' ')[1] : t.exit_time}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
