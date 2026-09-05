import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  CandleItem,
  TradeItem,
} from '../../types';
import {
  ArrowUpRight,
  ArrowDownRight,
  Flag,
  Crosshair,
  TrendingUp,
  BarChart3,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  MoveHorizontal,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { formatCurrency, formatPNL } from '../../utils/format';

interface TradeCandlestickChartProps {
  trade: TradeItem;
  candles: CandleItem[];
  entryIndex: number;
  exitIndex: number;
  minPrice: number;
  maxPrice: number;
  mfe?: number;
  mae?: number;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const TradeCandlestickChart: React.FC<TradeCandlestickChartProps> = ({
  trade,
  candles,
  entryIndex,
  exitIndex,
  minPrice,
  maxPrice,
  mfe,
  mae,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 420 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [chartType, setChartType] = useState<'candles' | 'line'>('candles');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ clientX: number; panOffset: number; moved: boolean } | null>(null);

  // Dynamic height calculation: expands to fill window in fullscreen mode
  const getTargetHeight = useCallback(() => {
    if (isFullscreen) {
      // Scale height to take advantage of full screen height
      // window.innerHeight minus modal header (~55px), HUD stats cards (~90px), chart paddings (~36px), HUD/legend (~80px)
      const calculated = window.innerHeight - 320;
      return Math.max(540, Math.min(1200, calculated));
    }
    return 420;
  }, [isFullscreen]);

  // Resize listener using ResizeObserver for instantaneous scaling on fullscreen/window changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleResize = () => {
      const clientWidth = el.clientWidth || window.innerWidth;
      const targetHeight = getTargetHeight();
      if (clientWidth > 0) {
        setDimensions({
          width: Math.max(400, clientWidth),
          height: targetHeight,
        });
      }
    };

    handleResize();

    const ro = new ResizeObserver(() => {
      handleResize();
    });
    ro.observe(el);

    window.addEventListener('resize', handleResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [getTargetHeight, isFullscreen]);

  // Reset zoom & pan when trade changes
  useEffect(() => {
    setZoomLevel(1);
    setPanOffset(0);
    setHoveredIndex(null);
    setMousePos(null);
  }, [trade.id, candles]);

  // Margins
  const margin = { top: 35, right: 80, bottom: 40, left: 20 };
  const plotWidth = Math.max(100, dimensions.width - margin.left - margin.right);
  const plotHeight = Math.max(100, dimensions.height - margin.top - margin.bottom);
  const volumeHeight = plotHeight * 0.18;
  const pricePlotHeight = plotHeight - volumeHeight - 15;

  // Center trade window
  const defaultCenter = useMemo(() => {
    if (entryIndex >= 0 && exitIndex >= 0) {
      return Math.floor((entryIndex + exitIndex) / 2);
    }
    return Math.floor(candles.length / 2);
  }, [entryIndex, exitIndex, candles.length]);

  // Window size based on zoomLevel
  const windowSize = useMemo(() => {
    if (zoomLevel <= 1 || candles.length <= 8) return candles.length;
    return Math.max(8, Math.min(candles.length, Math.round(candles.length / zoomLevel)));
  }, [candles.length, zoomLevel]);

  // Start index with pan offset applied and clamped strictly
  const startIndex = useMemo(() => {
    if (windowSize >= candles.length) return 0;
    const defaultStart = defaultCenter - Math.floor(windowSize / 2);
    const targetStart = Math.round(defaultStart + panOffset);
    return Math.max(0, Math.min(candles.length - windowSize, targetStart));
  }, [candles.length, windowSize, defaultCenter, panOffset]);

  // Zoomed & panned slice of candles
  const visibleCandles = useMemo(() => {
    if (windowSize >= candles.length) return candles;
    return candles.slice(startIndex, startIndex + windowSize);
  }, [candles, startIndex, windowSize]);

  // Candle times for precise trade alignment across pans & zooms
  const entryCandleTime = candles[entryIndex]?.time;
  const exitCandleTime = candles[exitIndex]?.time;
  const firstVisibleTime = visibleCandles[0]?.time;
  const lastVisibleTime = visibleCandles[visibleCandles.length - 1]?.time;

  // Adjust indices for visible candles
  const effectiveEntryIndex = useMemo(() => {
    if (!entryCandleTime || !firstVisibleTime || !lastVisibleTime) return -1;
    if (entryCandleTime < firstVisibleTime || entryCandleTime > lastVisibleTime) return -1;
    return visibleCandles.findIndex((c) => c.time === entryCandleTime);
  }, [visibleCandles, entryCandleTime, firstVisibleTime, lastVisibleTime]);

  const effectiveExitIndex = useMemo(() => {
    if (!exitCandleTime || !firstVisibleTime || !lastVisibleTime) return -1;
    if (exitCandleTime < firstVisibleTime || exitCandleTime > lastVisibleTime) return -1;
    return visibleCandles.findIndex((c) => c.time === exitCandleTime);
  }, [visibleCandles, exitCandleTime, firstVisibleTime, lastVisibleTime]);

  // Relative positions of entry and exit to current view
  const isEntryBeforeView = Boolean(entryCandleTime && firstVisibleTime && entryCandleTime < firstVisibleTime);
  const isEntryAfterView = Boolean(entryCandleTime && lastVisibleTime && entryCandleTime > lastVisibleTime);
  const isExitBeforeView = Boolean(exitCandleTime && firstVisibleTime && exitCandleTime < firstVisibleTime);
  const isExitAfterView = Boolean(exitCandleTime && lastVisibleTime && exitCandleTime > lastVisibleTime);

  // Compute price bounds with safety margin
  const { yMin, yMax, maxVol } = useMemo(() => {
    if (!visibleCandles.length) {
      return { yMin: minPrice * 0.98, yMax: maxPrice * 1.02, maxVol: 100 };
    }
    let low = Math.min(...visibleCandles.map((c) => c.low), trade.entry_price, trade.exit_price);
    let high = Math.max(...visibleCandles.map((c) => c.high), trade.entry_price, trade.exit_price);
    let maxV = Math.max(...visibleCandles.map((c) => c.volume), 1);

    const padding = (high - low) * 0.08 || high * 0.02;
    return {
      yMin: low - padding,
      yMax: high + padding,
      maxVol: maxV,
    };
  }, [visibleCandles, trade.entry_price, trade.exit_price, minPrice, maxPrice]);

  // Scale helpers
  const candleCount = visibleCandles.length || 1;
  const candleSlotWidth = plotWidth / candleCount;
  const candleBodyWidth = Math.max(2, Math.min(28, candleSlotWidth * 0.72));

  const getX = (index: number) => margin.left + (index + 0.5) * candleSlotWidth;
  const getY = (price: number) => {
    if (yMax === yMin) return margin.top + pricePlotHeight / 2;
    const ratio = (price - yMin) / (yMax - yMin);
    return margin.top + pricePlotHeight - ratio * pricePlotHeight;
  };

  const getVolY = (vol: number) => {
    const ratio = Math.min(1, Math.max(0, vol / (maxVol || 1)));
    return margin.top + plotHeight - ratio * volumeHeight;
  };

  // Price grid ticks (5 horizontal lines)
  const priceTicks = useMemo(() => {
    const ticks: number[] = [];
    const count = 5;
    const step = (yMax - yMin) / (count - 1);
    for (let i = 0; i < count; i++) {
      ticks.push(yMin + i * step);
    }
    return ticks;
  }, [yMin, yMax]);

  // Time grid ticks (5-6 points)
  const timeTicks = useMemo(() => {
    if (visibleCandles.length === 0) return [];
    const step = Math.max(1, Math.floor(visibleCandles.length / 5));
    const indices: number[] = [];
    for (let i = 0; i < visibleCandles.length; i += step) {
      indices.push(i);
    }
    return indices;
  }, [visibleCandles]);

  // Format price helper
  const formatPrice = (p: number) => {
    if (p < 0.01) return p.toFixed(5);
    if (p < 1) return p.toFixed(4);
    if (p < 10) return p.toFixed(3);
    return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Entry & Exit coordinates
  const entryY = getY(trade.entry_price);
  const exitY = getY(trade.exit_price);
  const isLong = trade.side === 'LONG';
  const isWin = trade.net_pnl > 0;

  // Clamped X positions for active trade corridor band
  const tradeBandStartX = effectiveEntryIndex !== -1
    ? getX(effectiveEntryIndex) - candleSlotWidth * 0.4
    : isEntryBeforeView
    ? margin.left
    : margin.left + plotWidth;

  const tradeBandEndX = effectiveExitIndex !== -1
    ? getX(effectiveExitIndex) + candleSlotWidth * 0.4
    : isExitAfterView
    ? margin.left + plotWidth
    : margin.left;

  const isTradeInView = tradeBandStartX < tradeBandEndX && !(isExitBeforeView || isEntryAfterView);

  // Wheel listener: Zoom centered on cursor & Shift+wheel for panning
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Horizontal wheel or Shift + wheel: Pan horizontally
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        if (windowSize >= candles.length) return;
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        const step = Math.max(1, Math.round(windowSize * 0.08));
        const candleDelta = (delta > 0 ? 1 : -1) * step;
        setPanOffset((prev) => prev + candleDelta);
        return;
      }

      // Vertical scroll: Zoom in or out centered at cursor position
      if (e.deltaY === 0) return;
      const rect = svgEl.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const t = Math.max(0, Math.min(1, (mouseX - margin.left) / plotWidth));

      setZoomLevel((currentZoom) => {
        const zoomFactor = e.deltaY < 0 ? 1.18 : 0.85;
        let nextZoom = currentZoom * zoomFactor;
        if (nextZoom < 1.05) nextZoom = 1;
        if (nextZoom > 8) nextZoom = 8;
        nextZoom = Number(nextZoom.toFixed(2));

        if (nextZoom === currentZoom) return currentZoom;

        if (nextZoom === 1) {
          setPanOffset(0);
          return 1;
        }

        // Adjust panOffset so that the candle under cursor stays in place
        const currentWinSize = Math.max(8, Math.min(candles.length, Math.round(candles.length / currentZoom)));
        const newWinSize = Math.max(8, Math.min(candles.length, Math.round(candles.length / nextZoom)));
        const currentStart = Math.max(
          0,
          Math.min(candles.length - currentWinSize, Math.round(defaultCenter - currentWinSize / 2 + panOffset))
        );
        const targetCandle = currentStart + t * currentWinSize;
        const newStart = Math.max(0, Math.min(candles.length - newWinSize, Math.round(targetCandle - t * newWinSize)));
        const newDefaultStart = defaultCenter - Math.floor(newWinSize / 2);
        setPanOffset(newStart - newDefaultStart);

        return nextZoom;
      });
    };

    svgEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => svgEl.removeEventListener('wheel', handleWheel);
  }, [plotWidth, margin.left, windowSize, defaultCenter, panOffset, candles.length]);

  // Click & Drag to Pan listeners
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return; // Left click only
    dragStartRef.current = {
      clientX: e.clientX,
      panOffset: panOffset,
      moved: false,
    };
    setIsDragging(true);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.clientX;
      if (Math.abs(dx) > 3) {
        dragStartRef.current.moved = true;
      }
      const candlesMoved = dx / candleSlotWidth;
      // Dragging right pulls earlier candles into view (decreases offset)
      const targetPan = dragStartRef.current.panOffset - candlesMoved;
      setPanOffset(targetPan);
    };

    const handleGlobalMouseUp = () => {
      if (dragStartRef.current) {
        dragStartRef.current = null;
        setIsDragging(false);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [candleSlotWidth]);

  // Track hover coordinate
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) return; // Pause hover updates while dragging
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= margin.left && x <= margin.left + plotWidth && y >= margin.top && y <= margin.top + plotHeight) {
      setMousePos({ x, y });
      const idx = Math.floor((x - margin.left) / candleSlotWidth);
      if (idx >= 0 && idx < visibleCandles.length) {
        setHoveredIndex(idx);
      }
    } else {
      setHoveredIndex(null);
      setMousePos(null);
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) return;
    setHoveredIndex(null);
    setMousePos(null);
  };

  const currentHoveredCandle = hoveredIndex !== null ? visibleCandles[hoveredIndex] : null;
  const currentHoveredCandleTime = currentHoveredCandle?.time;
  const isActiveTradeHovered = Boolean(
    currentHoveredCandleTime &&
    entryCandleTime &&
    exitCandleTime &&
    currentHoveredCandleTime >= entryCandleTime &&
    currentHoveredCandleTime <= exitCandleTime
  );

  // Determine hovered candle relation to trade based on timestamp
  const getHoverStatus = (idx: number) => {
    const candleTime = visibleCandles[idx]?.time;
    if (!candleTime || !entryCandleTime || !exitCandleTime) return '';
    if (candleTime < entryCandleTime) return 'Pre-Trade';
    if (candleTime >= entryCandleTime && candleTime <= exitCandleTime) return `Active ${trade.side} Position`;
    return 'Post-Trade Exit';
  };

  // Path generator for line chart mode
  const linePath = useMemo(() => {
    if (!visibleCandles.length) return '';
    return visibleCandles.reduce((path, c, i) => {
      const x = getX(i);
      const y = getY(c.close);
      return i === 0 ? `M ${x} ${y}` : `${path} L ${x} ${y}`;
    }, '');
  }, [visibleCandles, candleSlotWidth, yMin, yMax]);

  const areaPath = useMemo(() => {
    if (!visibleCandles.length || !linePath) return '';
    const firstX = getX(0);
    const lastX = getX(visibleCandles.length - 1);
    const bottomY = margin.top + pricePlotHeight;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [linePath, visibleCandles, candleSlotWidth]);

  return (
    <div className="flex flex-col space-y-3 w-full select-none" ref={containerRef}>
      {/* Row 1: Primary Controls Toolbar (View Toggle & Zoom) */}
      <div className="flex items-center justify-between gap-2 px-1 text-xs">
        {/* Chart View Toggle */}
        <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
          <button
            onClick={() => setChartType('candles')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition ${
              chartType === 'candles'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Candlesticks
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition ${
              chartType === 'line'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Area Line
          </button>
        </div>

        {/* Zoom & Pan Controls - Securely anchored on top-right, never wrapped */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 font-medium mr-1 hidden sm:inline">
            {zoomLevel.toFixed(1)}x
          </span>

          {/* Pan Left (Earlier Candles) */}
          {zoomLevel > 1 && (
            <button
              onClick={() => setPanOffset((p) => p - Math.max(1, Math.round(windowSize * 0.15)))}
              disabled={startIndex <= 0}
              title="Pan Left (Earlier Candles)"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Pan Right (Later Candles) */}
          {zoomLevel > 1 && (
            <button
              onClick={() => setPanOffset((p) => p + Math.max(1, Math.round(windowSize * 0.15)))}
              disabled={startIndex >= candles.length - windowSize}
              title="Pan Right (Later Candles)"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Zoom In */}
          <button
            onClick={() => setZoomLevel((z) => Math.min(8, Number((z + 0.5).toFixed(1))))}
            disabled={zoomLevel >= 8}
            title="Zoom In (or Scroll Wheel Up)"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => {
              setZoomLevel((z) => {
                const next = Math.max(1, Number((z - 0.5).toFixed(1)));
                if (next === 1) setPanOffset(0);
                return next;
              });
            }}
            disabled={zoomLevel <= 1}
            title="Zoom Out (or Scroll Wheel Down)"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Reset Zoom & Pan */}
          {(zoomLevel > 1 || panOffset !== 0) && (
            <button
              onClick={() => {
                setZoomLevel(1);
                setPanOffset(0);
              }}
              title="Reset Zoom & Pan"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1 text-[10px] font-bold cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}

          {/* Fullscreen toggle button on the chart toolbar */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Chart'}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer ml-0.5"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Dedicated OHLC & Position Phase Status HUD (Fixed Height, No Layout Shift) */}
      <div className="min-h-[32px] h-8 px-3 py-1 rounded-lg bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 flex items-center justify-between gap-3 text-[11px] font-mono transition-all">
        {currentHoveredCandle ? (
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
            <span className="text-slate-500 font-semibold shrink-0">{currentHoveredCandle.time_str}</span>
            <span className="shrink-0">
              O: <span className="font-semibold text-slate-800 dark:text-slate-200">${formatPrice(currentHoveredCandle.open)}</span>
            </span>
            <span className="shrink-0">
              H: <span className="font-semibold text-emerald-600 dark:text-emerald-400">${formatPrice(currentHoveredCandle.high)}</span>
            </span>
            <span className="shrink-0">
              L: <span className="font-semibold text-rose-600 dark:text-rose-400">${formatPrice(currentHoveredCandle.low)}</span>
            </span>
            <span className="shrink-0">
              C:{' '}
              <span
                className={`font-semibold ${
                  currentHoveredCandle.close >= currentHoveredCandle.open
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                ${formatPrice(currentHoveredCandle.close)}
              </span>
            </span>
            <span className="text-slate-400 shrink-0 hidden md:inline">
              Vol: {currentHoveredCandle.volume.toLocaleString()}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 italic text-[11px] overflow-hidden truncate">
            <Crosshair className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">
              Scroll wheel to zoom • Drag or Shift+wheel to pan • Hover for OHLC
            </span>
            <span className="sm:hidden">
              Scroll to zoom • Drag to pan
            </span>
          </div>
        )}

        {/* Right side: Execution Status Badge (or Trade Context when idle) */}
        <div className="shrink-0 flex items-center">
          {hoveredIndex !== null && getHoverStatus(hoveredIndex) ? (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase flex items-center gap-1.5 transition shadow-2xs ${
                isActiveTradeHovered
                  ? isLong
                    ? 'bg-emerald-100 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60'
                    : 'bg-rose-100 dark:bg-rose-950/90 text-rose-700 dark:text-rose-300 border border-rose-300/60 dark:border-rose-700/60'
                  : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300/50 dark:border-slate-600/50'
              }`}
            >
              {isActiveTradeHovered && (
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isLong ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              )}
              {getHoverStatus(hoveredIndex)}
            </span>
          ) : (
            <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-sans">
              <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{trade.symbol}</span>
              <span>•</span>
              <span className={isLong ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{trade.side}</span>
              <span>•</span>
              <span className="font-mono">{trade.duration_formatted}</span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950/[0.02] dark:bg-slate-950/60 overflow-hidden shadow-inner w-full">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={`w-full block select-none ${
            isDragging
              ? 'cursor-grabbing'
              : zoomLevel > 1
              ? 'cursor-grab'
              : 'cursor-crosshair'
          }`}
        >
          <defs>
            {/* Linear gradient for Area mode */}
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isWin ? '#10B981' : '#F43F5E'} stopOpacity="0.32" />
              <stop offset="90%" stopColor={isWin ? '#10B981' : '#F43F5E'} stopOpacity="0.01" />
            </linearGradient>

            {/* Linear gradient for trade zone */}
            <linearGradient id="tradeZoneGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isWin ? '#10B981' : '#F43F5E'} stopOpacity="0.14" />
              <stop offset="100%" stopColor={isWin ? '#10B981' : '#F43F5E'} stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines (Horizontal Price Grid) */}
          {priceTicks.map((pt, i) => {
            const y = getY(pt);
            return (
              <g key={`grid-${i}`}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={margin.left + plotWidth}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200/70 dark:text-slate-800/80"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                {/* Price Axis Labels on Right */}
                <text
                  x={margin.left + plotWidth + 8}
                  y={y + 3.5}
                  className="text-[10px] font-mono fill-slate-400 dark:fill-slate-500 font-medium"
                >
                  ${formatPrice(pt)}
                </text>
              </g>
            );
          })}

          {/* Vertical Time Grid & Labels */}
          {timeTicks.map((idx) => {
            const x = getX(idx);
            const c = visibleCandles[idx];
            if (!c) return null;
            return (
              <g key={`tgrid-${idx}`}>
                <line
                  x1={x}
                  y1={margin.top}
                  x2={x}
                  y2={margin.top + plotHeight}
                  stroke="currentColor"
                  className="text-slate-200/40 dark:text-slate-800/40"
                  strokeWidth="1"
                  strokeDasharray="2 4"
                />
                <text
                  x={x}
                  y={margin.top + plotHeight + 18}
                  textAnchor="middle"
                  className="text-[10px] font-mono fill-slate-400 dark:fill-slate-500"
                >
                  {c.time_str}
                </text>
              </g>
            );
          })}

          {/* ACTIVE TRADE WINDOW / EXECUTION ZONE (Highlighted Corridor) */}
          {isTradeInView && (
            <g>
              {/* Full height vertical execution band */}
              <rect
                x={tradeBandStartX}
                y={margin.top}
                width={Math.max(2, tradeBandEndX - tradeBandStartX)}
                height={plotHeight}
                fill="url(#tradeZoneGrad)"
                className="transition-all duration-150"
              />
              {/* Vertical border at entry candle */}
              {effectiveEntryIndex !== -1 && (
                <line
                  x1={getX(effectiveEntryIndex)}
                  y1={margin.top}
                  x2={getX(effectiveEntryIndex)}
                  y2={margin.top + plotHeight}
                  stroke={isLong ? '#10B981' : '#F43F5E'}
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  opacity="0.7"
                />
              )}
              {/* Vertical border at exit candle */}
              {effectiveExitIndex !== -1 && (
                <line
                  x1={getX(effectiveExitIndex)}
                  y1={margin.top}
                  x2={getX(effectiveExitIndex)}
                  y2={margin.top + plotHeight}
                  stroke="#6366F1"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  opacity="0.7"
                />
              )}

              {/* Trade Corridor between Entry Price and Exit Price */}
              <rect
                x={tradeBandStartX}
                y={Math.min(entryY, exitY)}
                width={Math.max(2, tradeBandEndX - tradeBandStartX)}
                height={Math.max(2, Math.abs(entryY - exitY))}
                fill={isWin ? '#10B981' : '#F43F5E'}
                fillOpacity="0.16"
                stroke={isWin ? '#10B981' : '#F43F5E'}
                strokeWidth="1"
                strokeDasharray="2 2"
                rx={2}
              />
            </g>
          )}

          {/* VOLUME HISTOGRAM (Bottom sub-plot) */}
          {visibleCandles.map((c, i) => {
            const x = getX(i) - candleBodyWidth / 2;
            const y = getVolY(c.volume);
            const h = Math.max(1, margin.top + plotHeight - y);
            const isBull = c.close >= c.open;
            return (
              <rect
                key={`vol-${i}`}
                x={x}
                y={y}
                width={candleBodyWidth}
                height={h}
                fill={isBull ? '#10B981' : '#F43F5E'}
                opacity={hoveredIndex === i ? 0.75 : 0.28}
                rx={1}
              />
            );
          })}

          {/* CANDLESTICKS OR AREA LINE */}
          {chartType === 'line' ? (
            <g>
              <path d={areaPath} fill="url(#areaGradient)" />
              <path
                d={linePath}
                fill="none"
                stroke={isWin ? '#10B981' : '#F43F5E'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          ) : (
            visibleCandles.map((c, i) => {
              const x = getX(i);
              const openY = getY(c.open);
              const closeY = getY(c.close);
              const highY = getY(c.high);
              const lowY = getY(c.low);
              const isBull = c.close >= c.open;
              const color = isBull ? '#10B981' : '#F43F5E';
              const bodyTop = Math.min(openY, closeY);
              const bodyHeight = Math.max(1.5, Math.abs(openY - closeY));

              const isEntryCandle = i === effectiveEntryIndex;
              const isExitCandle = i === effectiveExitIndex;

              return (
                <g key={`candle-${i}`} className="transition-opacity duration-150">
                  {/* High/Low Wick */}
                  <line
                    x1={x}
                    y1={highY}
                    x2={x}
                    y2={lowY}
                    stroke={color}
                    strokeWidth={hoveredIndex === i ? '2' : '1.2'}
                    opacity={hoveredIndex !== null && hoveredIndex !== i ? 0.45 : 1}
                  />
                  {/* Candle Body */}
                  <rect
                    x={x - candleBodyWidth / 2}
                    y={bodyTop}
                    width={candleBodyWidth}
                    height={bodyHeight}
                    fill={color}
                    stroke={color}
                    strokeWidth={hoveredIndex === i ? '1.5' : '0.5'}
                    rx={1}
                    opacity={hoveredIndex !== null && hoveredIndex !== i ? 0.45 : 1}
                  />

                  {/* Glow outline on Entry/Exit candles */}
                  {(isEntryCandle || isExitCandle) && (
                    <circle
                      cx={x}
                      cy={isEntryCandle ? entryY : exitY}
                      r="5"
                      fill={isEntryCandle ? (isLong ? '#10B981' : '#F43F5E') : '#6366F1'}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                  )}
                </g>
              );
            })
          )}

          {/* CLEAN ENTRY PRICE LEVEL (Horizontal line & badge) */}
          <g className="transition-all duration-200">
            {/* Dashed guide across chart */}
            <line
              x1={margin.left}
              y1={entryY}
              x2={margin.left + plotWidth}
              y2={entryY}
              stroke={isLong ? '#10B981' : '#F43F5E'}
              strokeWidth="1.5"
              strokeDasharray="5 3"
            />

            {/* Entry Price Tag on Right Axis */}
            <g transform={`translate(${margin.left + plotWidth}, ${entryY - 10})`}>
              <rect
                x="0"
                y="0"
                width="78"
                height="20"
                rx="4"
                fill={isLong ? '#059669' : '#E11D48'}
                className="shadow-sm"
              />
              <text x="6" y="14" fill="#FFFFFF" className="text-[10px] font-mono font-bold">
                ${formatPrice(trade.entry_price)}
              </text>
            </g>

            {/* Entry Marker Badge near Entry Candle */}
            {effectiveEntryIndex !== -1 && (
              <g transform={`translate(${getX(effectiveEntryIndex)}, ${entryY})`}>
                <circle r="4" fill={isLong ? '#10B981' : '#F43F5E'} stroke="#FFFFFF" strokeWidth="2" />
                <g transform={`translate(-36, ${isLong ? 12 : -28})`}>
                  <rect
                    x="0"
                    y="0"
                    width="72"
                    height="18"
                    rx="4"
                    fill={isLong ? '#065F46' : '#9F1239'}
                    className="shadow-md"
                  />
                  <text
                    x="36"
                    y="12.5"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    className="text-[9px] font-sans font-bold tracking-wide"
                  >
                    ENTRY {isLong ? '▲' : '▼'}
                  </text>
                </g>
              </g>
            )}
          </g>

          {/* CLEAN EXIT PRICE LEVEL (Horizontal line & badge) */}
          <g className="transition-all duration-200">
            {/* Dashed guide across chart */}
            <line
              x1={margin.left}
              y1={exitY}
              x2={margin.left + plotWidth}
              y2={exitY}
              stroke="#6366F1"
              strokeWidth="1.5"
              strokeDasharray="5 3"
            />

            {/* Exit Price Tag on Right Axis */}
            <g transform={`translate(${margin.left + plotWidth}, ${exitY - 10})`}>
              <rect x="0" y="0" width="78" height="20" rx="4" fill="#4F46E5" className="shadow-sm" />
              <text x="6" y="14" fill="#FFFFFF" className="text-[10px] font-mono font-bold">
                ${formatPrice(trade.exit_price)}
              </text>
            </g>

            {/* Exit Marker Badge near Exit Candle */}
            {effectiveExitIndex !== -1 && (
              <g transform={`translate(${getX(effectiveExitIndex)}, ${exitY})`}>
                <circle r="4" fill="#6366F1" stroke="#FFFFFF" strokeWidth="2" />
                <g transform={`translate(-30, ${isWin ? -28 : 12})`}>
                  <rect x="0" y="0" width="60" height="18" rx="4" fill="#3730A3" className="shadow-md" />
                  <text
                    x="30"
                    y="12.5"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    className="text-[9px] font-sans font-bold tracking-wide"
                  >
                    EXIT 🏁
                  </text>
                </g>
              </g>
            )}
          </g>

          {/* INTERACTIVE CROSSHAIR */}
          {mousePos && hoveredIndex !== null && (
            <g>
              {/* Vertical guideline */}
              <line
                x1={getX(hoveredIndex)}
                y1={margin.top}
                x2={getX(hoveredIndex)}
                y2={margin.top + plotHeight}
                stroke="#94A3B8"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.8"
              />
              {/* Horizontal guideline */}
              <line
                x1={margin.left}
                y1={mousePos.y}
                x2={margin.left + plotWidth}
                y2={mousePos.y}
                stroke="#94A3B8"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.8"
              />

              {/* Dynamic Price on Axis */}
              {(() => {
                const ratio = (margin.top + pricePlotHeight - mousePos.y) / pricePlotHeight;
                const hoveredPrice = yMin + ratio * (yMax - yMin);
                if (mousePos.y <= margin.top + pricePlotHeight && mousePos.y >= margin.top) {
                  return (
                    <g transform={`translate(${margin.left + plotWidth}, ${mousePos.y - 9})`}>
                      <rect
                        x="0"
                        y="0"
                        width="76"
                        height="18"
                        rx="3"
                        fill="#334155"
                        className="shadow-sm"
                      />
                      <text x="6" y="13" fill="#FFFFFF" className="text-[10px] font-mono font-medium">
                        ${formatPrice(hoveredPrice)}
                      </text>
                    </g>
                  );
                }
                return null;
              })()}
            </g>
          )}
        </svg>
      </div>

      {/* Execution Visual Legend Footer */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 px-1">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isLong ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <span>
              Entry Level: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">${formatPrice(trade.entry_price)}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span>
              Exit Level: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">${formatPrice(trade.exit_price)}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`w-3.5 h-2 rounded border ${
                isWin
                  ? 'bg-emerald-500/20 border-emerald-500'
                  : 'bg-rose-500/20 border-rose-500'
              }`}
            />
            <span>Execution Window ({trade.duration_formatted})</span>
          </div>
        </div>

        {mfe !== undefined && mae !== undefined && (
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>
              Best Run (MFE):{' '}
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">${formatPrice(mfe)}</span>
            </span>
            <span>
              Max Drawdown (MAE):{' '}
              <span className="text-rose-600 dark:text-rose-400 font-bold">${formatPrice(mae)}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
