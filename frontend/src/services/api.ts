import {
  AccountItem,
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
  FullReportData,
  TradeChartData,
  PositionsResponse
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

function extractErrorMessage(errData: any, status: number): string {
  if (!errData) return `HTTP Error ${status}`;
  if (typeof errData === 'string') return errData;

  // FastAPI validation error array: [{loc: [...], msg: "...", type: "..."}]
  if (Array.isArray(errData.detail)) {
    const msgs = errData.detail
      .map((item: any) => {
        if (typeof item === 'string') return item;
        if (item && item.msg) {
          const loc = Array.isArray(item.loc)
            ? item.loc.filter((l: any) => l !== 'body').join('.')
            : '';
          return loc ? `${loc}: ${item.msg}` : item.msg;
        }
        return JSON.stringify(item);
      })
      .filter(Boolean);
    if (msgs.length > 0) return msgs.join('; ');
  }

  // detail as string
  if (typeof errData.detail === 'string') {
    return errData.detail;
  }

  // detail as object
  if (errData.detail && typeof errData.detail === 'object') {
    try {
      return JSON.stringify(errData.detail);
    } catch {
      return String(errData.detail);
    }
  }

  // message field as string
  if (typeof errData.message === 'string') {
    return errData.message;
  }

  try {
    return JSON.stringify(errData);
  } catch {
    return `HTTP Error ${status}`;
  }
}

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
      const errData = await res.json();
      errorMsg = extractErrorMessage(errData, res.status);
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

  getAccounts: () =>
    fetchJson<{ accounts: AccountItem[]; active_account_id: number | null; active_account_name: string }>('/accounts'),

  createAccount: (payload: { name: string; api_key: string; api_secret: string; lookback_days?: number }) =>
    fetchJson<{
      status: string;
      message: string;
      balance: number;
      account_id: number;
      account?: AccountItem;
    }>('/accounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAccount: (accountId: number, payload: { name?: string; api_key?: string; api_secret?: string }) =>
    fetchJson<{ status: string; message: string }>(`/accounts/${accountId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteAccount: (accountId: number) =>
    fetchJson<{ status: string; message: string }>(`/accounts/${accountId}`, {
      method: 'DELETE',
    }),

  activateAccount: (accountId: number) =>
    fetchJson<{ status: string; active_account_id: number; active_account_name: string }>(
      `/accounts/${accountId}/activate`,
      {
        method: 'POST',
      }
    ),

  syncAccount: (accountId: number, days: number = 30) =>
    fetchJson<{ status: string; balance: number; new_fills: number; new_income: number; lookback_days?: number; last_sync: string }>(
      `/accounts/${accountId}/sync?days=${days}`,
      {
        method: 'POST',
      }
    ),

  syncAllAccounts: (days: number = 30) =>
    fetchJson<{
      status: string;
      total_new_fills: number;
      total_new_income: number;
      synced_accounts: number;
      details: any[];
      errors: string[];
    }>(`/accounts/sync-all?days=${days}`, {
      method: 'POST',
    }),
  
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
    fetchJson<{ status: string; message: string; balance: number; account_id: number }>('/connection/save', {
      method: 'POST',
      body: JSON.stringify({ api_key, api_secret }),
    }),

  triggerSync: (days: number = 30) =>
    fetchJson<{ status: string; balance: number; new_fills: number; lookback_days?: number; last_sync: string }>(
      `/sync?days=${days}`,
      {
        method: 'POST',
      }
    ),

  getOverview: () => fetchJson<OverviewData>('/overview'),

  getEquityCurve: (timeframe: string = 'ALL') =>
    fetchJson<{ timeframe: string; data: EquityPoint[] }>(`/equity-curve?timeframe=${timeframe}`),

  getTrades: (params: {
    symbol?: string;
    side?: string;
    outcome?: string;
    date?: string;
    search?: string;
    account_id?: number;
    page?: number;
    page_size?: number;
  }) => {
    const query = new URLSearchParams();
    if (params.symbol) query.set('symbol', params.symbol);
    if (params.side) query.set('side', params.side);
    if (params.outcome) query.set('outcome', params.outcome);
    if (params.date) query.set('date', params.date);
    if (params.search) query.set('search', params.search);
    if (params.account_id !== undefined) query.set('account_id', params.account_id.toString());
    if (params.page) query.set('page', params.page.toString());
    if (params.page_size) query.set('page_size', params.page_size.toString());
    return fetchJson<{ total: number; page: number; page_size: number; trades: TradeItem[] }>(
      `/trades?${query.toString()}`
    );
  },

  getSingleTrade: (tradeId: string) => fetchJson<TradeItem>(`/trades/${tradeId}`),

  getTradeChart: (tradeId: string, interval?: string) => {
    const query = interval ? `?interval=${encodeURIComponent(interval)}` : '';
    return fetchJson<TradeChartData>(`/trades/${tradeId}/chart${query}`);
  },

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

  getPositions: () => fetchJson<PositionsResponse>('/positions'),

  resetDemo: () => fetchJson<{ status: string; count: number }>('/demo/reset', { method: 'POST' }),
};
