import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { CalendarDay, TradeItem } from '../types';

export const CalendarPage: React.FC = () => {
  const [days, setDays] = useState<Record<string, CalendarDay>>({});
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDayTrades, setSelectedDayTrades] = useState<{ date: string; trades: TradeItem[] } | null>(null);
  const [loading, setLoading] = useState(true);

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
    if (!days[dateStr]) return;
    try {
      const res = await api.getTrades({ search: dateStr, page_size: 50 });
      setSelectedDayTrades({ date: dateStr, trades: res.trades });
    } catch (e) {
      console.error(e);
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
            <h2 className="text-xl font-bold text-slate-900">{monthLabel}</h2>
            <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
              <button
                onClick={prevMonth}
                className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition"
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
                monthPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {monthPnl >= 0 ? '+' : ''}${monthPnl.toFixed(2)}
            </span>
          </div>

          <div className="border-l border-slate-200 pl-4 text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
              Month Trades
            </span>
            <span className="text-base font-bold text-slate-800">{monthTrades}</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card-white overflow-hidden p-4">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
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
            <div key={`empty-${i}`} className="h-24 bg-slate-50/50 rounded-lg border border-transparent" />
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
                      ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300 hover:shadow-subtle cursor-pointer'
                      : 'bg-rose-50/50 border-rose-200 hover:border-rose-300 hover:shadow-subtle cursor-pointer'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">{dayNum}</span>
                  {hasTrades && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      {dayData.trades} {dayData.trades === 1 ? 'trade' : 'trades'}
                    </span>
                  )}
                </div>

                {hasTrades ? (
                  <div className="space-y-0.5">
                    <div
                      className={`text-xs font-bold font-mono ${
                        isPos ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {isPos ? '+' : ''}${dayData.net_pnl.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      WR: {dayData.win_rate}%
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-300 italic">No trades</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Trades Modal */}
      {selectedDayTrades && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Trades on {selectedDayTrades.date}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedDayTrades.trades.length} executions
                </p>
              </div>
              <button
                onClick={() => setSelectedDayTrades(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-2.5">
              {selectedDayTrades.trades.map((t) => {
                const isWin = t.net_pnl > 0;
                return (
                  <div
                    key={t.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <span className="font-bold font-sans text-slate-900 mr-2">{t.symbol}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-bold ${
                          t.side === 'LONG' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {t.side}
                      </span>
                      <span className="text-slate-400 font-sans ml-2 text-[11px]">{t.exit_time}</span>
                    </div>

                    <div className="text-right">
                      <div className={`font-bold ${isWin ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isWin ? '+' : ''}${t.net_pnl.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans">
                        Margin return: {t.pnl_percentage}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
