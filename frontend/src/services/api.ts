import {
  AccountStatus,
  OverviewData,
  EquityPoint,
  TradeItem,
  AssetsResponse,
  LongShortData,
  TimeAnalysisData,
  BehaviorData,
  RiskData,
  FeesData,
  MarketRegime,
  CalendarDay,
  WinnerLoserStats,
  FullReportData
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  } catch (_err: any) {
    throw new Error(
      `Cannot connect to backend server. Please make sure the Python FastAPI backend is running on http://127.0.0.1:8000.`
    );
  }

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const err = await res.json();
      errorMsg = err.detail || errorMsg;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  getStatus: () => fetchJson<AccountStatus>('/status'),
  getPublicIp: () => fetchJson<{ ip: string; status: string }>('/ip'),
  
  toggleMode: (is_demo_mode: boolean) =>
    fetchJson<{ is_demo_mode: boolean }>('/mode/toggle', {
      method: 'POST',
      body: JSON.stringify({ is_demo_mode }),
    }),

  testConnection: (api_key: string, api_secret: string) =>
    fetchJson<{ status: string; message: string; details: any }>('/connection/test', {
      method: 'POST',
      body: JSON.stringify({ api_key, api_secret }),
    }),

  saveConnection: (api_key: string, api_secret: string) =>
    fetchJson<{ status: string; message: string; balance: number }>('/connection/save', {
      method: 'POST',
      body: JSON.stringify({ api_key, api_secret }),
    }),

  triggerSync: () =>
    fetchJson<{ status: string; balance: number; new_fills: number; last_sync: string }>('/sync', {
      method: 'POST',
    }),

  getOverview: () => fetchJson<OverviewData>('/overview'),

  getEquityCurve: (timeframe: string = 'ALL') =>
    fetchJson<{ timeframe: string; data: EquityPoint[] }>(`/equity-curve?timeframe=${timeframe}`),

  getTrades: (params: {
    symbol?: string;
    side?: string;
    outcome?: string;
    date?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }) => {
    const query = new URLSearchParams();
    if (params.symbol) query.set('symbol', params.symbol);
    if (params.side) query.set('side', params.side);
    if (params.outcome) query.set('outcome', params.outcome);
    if (params.date) query.set('date', params.date);
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', params.page.toString());
    if (params.page_size) query.set('page_size', params.page_size.toString());
    return fetchJson<{ total: number; page: number; page_size: number; trades: TradeItem[] }>(
      `/trades?${query.toString()}`
    );
  },

  getSingleTrade: (tradeId: string) => fetchJson<TradeItem>(`/trades/${tradeId}`),

  getTradedSymbols: () => fetchJson<{ symbols: string[] }>('/traded-symbols'),

  getAssets: () => fetchJson<AssetsResponse>('/assets'),

  getLongShort: () => fetchJson<LongShortData>('/long-short'),

  getTimeAnalysis: () => fetchJson<TimeAnalysisData>('/time-analysis'),

  getBehavior: () => fetchJson<BehaviorData>('/behavior'),

  getRisk: () => fetchJson<RiskData>('/risk'),

  getFees: () => fetchJson<FeesData>('/fees'),

  getMarketRegimes: () => fetchJson<{ regimes: MarketRegime[] }>('/market'),

  getCalendar: () => fetchJson<{ days: CalendarDay[] }>('/calendar'),

  getWinnerLoserStats: () => fetchJson<WinnerLoserStats>('/winner-loser'),

  getReport: () => fetchJson<FullReportData>('/reports'),

  resetDemo: () => fetchJson<{ status: string; count: number }>('/demo/reset', { method: 'POST' }),
};
