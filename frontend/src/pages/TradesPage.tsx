import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Clock,
  Coins,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { TradeItem } from '../types';
import { formatFee, formatPNL, formatCurrency } from '../utils/format';
import { useTrading } from '../context/TradingContext';

export const TradesPage: React.FC = () => {
  const { status } = useTrading();
  const [trades, setTrades] = useState<TradeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [symbol, setSymbol] = useState('ALL');
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [side, setSide] = useState('ALL');
  const [outcome, setOutcome] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<TradeItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Load available traded symbols
  useEffect(() => {
    const loadSymbols = async () => {
      try {
        const res = await api.getTradedSymbols();
        if (res.symbols && res.symbols.length > 0) {
          setAvailableSymbols(res.symbols);
        }
      } catch (err) {
        console.warn('Failed to load traded symbols:', err);
      }
    };
    loadSymbols();
  }, [status?.is_demo_mode, status?.last_sync_time]);

  useEffect(() => {
    loadTrades();
  }, [page, symbol, side, outcome, search, status?.is_demo_mode, status?.last_sync_time]);

  const loadTrades = async () => {
    setLoading(true);
    try {
      const res = await api.getTrades({
        symbol: symbol === 'ALL' ? undefined : symbol,
        side: side === 'ALL' ? undefined : side,
        outcome: outcome === 'ALL' ? undefined : outcome,
        search: search.trim() || undefined,
        page,
        page_size: pageSize,
      });
      setTrades(res.trades);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setSymbol('ALL');
    setSide('ALL');
    setOutcome('ALL');
    setPage(1);
  };

  const isFilterActive = symbol !== 'ALL' || side !== 'ALL' || outcome !== 'ALL' || search.trim().length > 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Filters & Search Toolbar */}
      <div className="card-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search symbol, notes, flags..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white w-52 transition"
              />
            </div>

            {/* Symbol Filter */}
            <select
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="ALL">All Symbols ({availableSymbols.length || 'All'})</option>
              {availableSymbols.length > 0 ? (
                availableSymbols.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))
              ) : (
                <>
                  <option value="BTCUSDT">BTCUSDT</option>
                  <option value="ETHUSDT">ETHUSDT</option>
                  <option value="SOLUSDT">SOLUSDT</option>
                  <option value="BNBUSDT">BNBUSDT</option>
                  <option value="DOGEUSDT">DOGEUSDT</option>
                </>
              )}
            </select>

            {/* Side Filter */}
            <select
              value={side}
              onChange={(e) => {
                setSide(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="ALL">All Directions</option>
              <option value="LONG">Long Only</option>
              <option value="SHORT">Short Only</option>
            </select>

            {/* Outcome Select Dropdown */}
            <select
              value={outcome}
              onChange={(e) => {
                setOutcome(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="ALL">All Results</option>
              <option value="WIN">Winners Only</option>
              <option value="LOSS">Losers Only</option>
            </select>

            {isFilterActive && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-900 px-2 py-1 rounded-md hover:bg-slate-100 transition"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Showing <span className="text-slate-800 font-semibold">{trades.length}</span> of{' '}
            <span className="text-slate-800 font-semibold">{total}</span> trades
          </div>
        </div>

        {/* Segmented Quick Filter Pills for Outcome (Winners / Losers) */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 uppercase tracking-wider">Outcome:</span>
            <button
              onClick={() => {
                setOutcome('ALL');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                outcome === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              All Trades
            </button>
            <button
              onClick={() => {
                setOutcome('WIN');
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                outcome === 'WIN'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100/70'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${outcome === 'WIN' ? 'bg-white' : 'bg-emerald-500'}`} />
              Winners Only
            </button>
            <button
              onClick={() => {
                setOutcome('LOSS');
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                outcome === 'LOSS'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-700 border border-rose-200/60 hover:bg-rose-100/70'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${outcome === 'LOSS' ? 'bg-white' : 'bg-rose-500'}`} />
              Losers Only
            </button>
          </div>
        </div>
      </div>

      {/* Trades Journal Table */}
      <div className="card-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3">Date / Time</th>
                <th className="py-3 px-3">Symbol</th>
                <th className="py-3 px-3">Side</th>
                <th className="py-3 px-3">Entry</th>
                <th className="py-3 px-3">Exit</th>
                <th className="py-3 px-3">Size ($)</th>
                <th className="py-3 px-3">Leverage</th>
                <th className="py-3 px-3">Net PNL</th>
                <th className="py-3 px-3">Fee / Funding</th>
                <th className="py-3 px-3">PNL %</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-3">Result</th>
                <th className="py-3 px-3">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={13} className="py-3.5 px-4">
                      <div className="h-4 bg-slate-100 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : trades.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-14 text-center font-sans">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p className="text-sm font-semibold text-slate-700">No trades match criteria</p>
                      <p className="text-xs text-slate-400">
                        {outcome !== 'ALL'
                          ? `No ${outcome === 'WIN' ? 'winning' : 'losing'} trades found with the current filters.`
                          : 'Try changing your search query, direction, or symbol filter.'}
                      </p>
                      {isFilterActive && (
                        <button
                          onClick={resetFilters}
                          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 shadow-sm transition"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reset All Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                trades.map((trade) => {
                  const isWin = trade.net_pnl > 0;
                  const isLong = trade.side === 'LONG';

                  return (
                    <tr
                      key={trade.id}
                      onClick={() => setSelectedTrade(trade)}
                      className="hover:bg-slate-50/80 cursor-pointer transition"
                    >
                      <td className="py-3 px-4 font-sans text-slate-500 whitespace-nowrap">
                        {trade.exit_time}
                      </td>
                      <td className="py-3 px-4 font-sans font-bold text-slate-900 whitespace-nowrap">
                        {trade.symbol}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded font-sans inline-flex items-center gap-0.5 ${
                            isLong
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isLong ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {trade.side}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 tabular-nums">
                        ${trade.entry_price.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-700 tabular-nums">
                        ${trade.exit_price.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-700 tabular-nums">
                        ${trade.position_value.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{trade.leverage}x</td>
                      <td
                        className={`py-3 px-3 font-bold tabular-nums ${
                          isWin ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {formatPNL(trade.net_pnl, 2)}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] whitespace-nowrap leading-tight">
                        <div className="text-rose-600 font-semibold">
                          Fee: -{formatFee(trade.commission)}
                        </div>
                        <div className={trade.funding_fees >= 0 ? 'text-emerald-600 font-medium' : 'text-slate-500'}>
                          Fund: {trade.funding_fees >= 0 ? '+' : ''}{formatFee(trade.funding_fees)}
                        </div>
                      </td>
                      <td
                        className={`py-3 px-3 tabular-nums ${
                          isWin ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isWin ? '+' : ''}{trade.pnl_percentage.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-sans text-[11px] whitespace-nowrap">
                        {trade.duration_formatted}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-sans">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isWin
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isWin ? 'WIN' : 'LOSS'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans whitespace-nowrap">
                        {trade.behavioral_flags.length > 0 ? (
                          <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                            {trade.behavioral_flags[0].replace('_', ' ')}
                            {trade.behavioral_flags.length > 1 && ` +${trade.behavioral_flags.length - 1}`}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Page <span className="font-semibold text-slate-800">{page}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalPages}</span>
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Trade Detail Modal / Slide-over */}
      {selectedTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    selectedTrade.side === 'LONG'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {selectedTrade.side === 'LONG' ? 'L' : 'S'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {selectedTrade.symbol} {selectedTrade.side} Trade
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">ID: {selectedTrade.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTrade(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Financial Outcome Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Net PNL
                  </span>
                  <div
                    className={`text-xl font-bold font-mono ${
                      selectedTrade.net_pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {formatPNL(selectedTrade.net_pnl, 2)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Return on Margin
                  </span>
                  <div
                    className={`text-base font-bold font-mono ${
                      selectedTrade.pnl_percentage >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {selectedTrade.pnl_percentage >= 0 ? '+' : ''}{selectedTrade.pnl_percentage.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Price & Execution Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border border-slate-100 rounded-lg">
                  <span className="text-[10px] text-slate-400 font-medium block">Entry Price</span>
                  <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                    ${selectedTrade.entry_price.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">{selectedTrade.entry_time}</span>
                </div>

                <div className="p-3 border border-slate-100 rounded-lg">
                  <span className="text-[10px] text-slate-400 font-medium block">Exit Price</span>
                  <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                    ${selectedTrade.exit_price.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">{selectedTrade.exit_time}</span>
                </div>
              </div>

              {/* Sizing & Itemized Cost Breakdown */}
              <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-white">
                <span className="text-[11px] font-bold text-slate-800 block mb-1">
                  Itemized Cost Breakdown
                </span>
                <div className="flex justify-between text-slate-600">
                  <span>Gross PnL:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {formatPNL(selectedTrade.gross_pnl, 2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Trading Commission (Fees):</span>
                  <span className="font-mono text-rose-600 font-semibold">
                    -{formatFee(selectedTrade.commission)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Funding Fees:</span>
                  <span className={`font-mono font-semibold ${selectedTrade.funding_fees >= 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                    {selectedTrade.funding_fees >= 0 ? '+' : ''}{formatFee(selectedTrade.funding_fees)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-slate-900">
                  <span>Net Realized PnL:</span>
                  <span className="font-mono">
                    {formatPNL(selectedTrade.net_pnl, 2)}
                  </span>
                </div>
              </div>

              {/* Flags & Notes */}
              {selectedTrade.behavioral_flags.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-900 block">Behavioral Flaw Flagged</span>
                    <p className="text-amber-800 text-[11px] mt-0.5">
                      {selectedTrade.behavioral_flags.join(', ').replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
