export interface AccountStatus {
  is_demo_mode: boolean;
  is_connected: boolean;
  api_key_masked: string;
  last_sync_time: string | null;
  account_balance: number;
  unrealized_pnl: number;
  equity?: number;
  demo_trades_count: number;
  live_trades_count: number;
}

export interface KPIs {
  total_trades: number;
  current_balance: number;
  equity?: number;
  unrealized_pnl?: number;
  net_pnl: number;
  gross_pnl: number;
  today_pnl: number;
  seven_day_pnl: number;
  thirty_day_pnl: number;
  roi_pct: number;
  win_rate: number;
  profit_factor: number;
  average_trade: number;
  max_drawdown: number;
  max_drawdown_pct: number;
  trajectory: 'improving' | 'degrading' | 'steady' | 'neutral';
  total_fees: number;
  total_funding: number;
}

export interface OverviewData {
  kpis: KPIs;
  is_demo_mode: boolean;
  quick_insight: string;
  top_asset?: AssetItem;
  top_dragger?: AssetItem;
  risk_score: number;
  risk_tier: string;
  top_behavior?: BehaviorItem;
}

export interface TradeItem {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entry_time: string;
  exit_time: string;
  entry_price: number;
  exit_price: number;
  quantity: number;
  position_value: number;
  leverage: number;
  gross_pnl: number;
  pnl_percentage: number;
  commission: number;
  funding_fees: number;
  net_pnl: number;
  duration_seconds: number;
  duration_formatted: string;
  is_winner: boolean;
  behavioral_flags: string[];
  market_regime: string;
  notes: string;
}

export interface EquityPoint {
  timestamp: string;
  date: string;
  net_pnl: number;
  cumulative_pnl: number;
  equity: number;
  drawdown: number;
  drawdown_pct: number;
  symbol: string;
  side: string;
}

export interface AssetItem {
  symbol: string;
  trades: number;
  net_pnl: number;
  win_rate: number;
  avg_win: number;
  avg_loss: number;
  profit_factor: number;
  volume: number;
  fees: number;
  funding: number;
  is_profitable: boolean;
}

export interface AssetsResponse {
  assets: AssetItem[];
  top_driver: AssetItem | null;
  top_dragger: AssetItem | null;
}

export interface SideMetrics {
  trades: number;
  pnl: number;
  win_rate: number;
  avg_winner: number;
  avg_loser: number;
  profit_factor: number;
  volume: number;
  fees: number;
}

export interface LongShortData {
  long: SideMetrics;
  short: SideMetrics;
  insight: string;
}

export interface HourlyItem {
  hour: number;
  label: string;
  trades: number;
  net_pnl: number;
  win_rate: number;
}

export interface DailyItem {
  day: string;
  trades: number;
  net_pnl: number;
  win_rate: number;
}

export interface SessionItem {
  session: string;
  trades: number;
  net_pnl: number;
  win_rate: number;
  profit_factor: number;
}

export interface TimeAnalysisData {
  hourly: HourlyItem[];
  daily: DailyItem[];
  sessions: SessionItem[];
  best_window: string;
  worst_window: string;
}

export interface BehaviorItem {
  key: string;
  title: string;
  count: number;
  cost: number;
  description: string;
}

export interface FlaggedTrade {
  id: string;
  symbol: string;
  side: string;
  exit_time: string;
  net_pnl: number;
  leverage: number;
  position_value: number;
  flags: string[];
  duration_mins: number;
}

export interface BehaviorData {
  behaviors: BehaviorItem[];
  flagged_trades: FlaggedTrade[];
  total_flagged_count: number;
  discipline_score?: number;
  disciplined_trades_count?: number;
  total_trades_count?: number;
  total_habit_cost?: number;
}

export interface RiskScoreFactor {
  score: number;
  max: number;
  metric: string;
}

export interface RiskData {
  risk_score: number;
  risk_tier: string;
  score_breakdown: {
    drawdown_health: RiskScoreFactor;
    leverage_discipline: RiskScoreFactor;
    position_concentration: RiskScoreFactor;
    behavioral_discipline: RiskScoreFactor;
    expectancy_quality: RiskScoreFactor;
  };
  max_drawdown: number;
  max_drawdown_pct: number;
  current_drawdown: number;
  current_drawdown_pct: number;
  largest_position: number;
  avg_leverage: number;
  max_leverage: number;
  worst_daily_loss: number;
  position_concentration_pct: number;
  total_fees: number;
  total_funding: number;
}

export interface FeesData {
  gross_pnl: number;
  total_fees: number;
  funding_paid: number;
  funding_received: number;
  net_funding: number;
  net_pnl: number;
  fees_pct_gross: number;
  funding_pct_gross: number;
  total_drag_pct: number;
}

export interface MarketRegime {
  regime: string;
  trades: number;
  net_pnl: number;
  win_rate: number;
  profit_factor: number;
  is_profitable: boolean;
}

export interface CalendarDay {
  date: string;
  trades: number;
  net_pnl: number;
  win_rate: number;
  is_winner: boolean;
}

export interface WinnerLoserStats {
  avg_winner: number;
  avg_loser: number;
  largest_winner: number;
  largest_loser: number;
  avg_win_holding_mins: number;
  avg_loss_holding_mins: number;
  median_win_holding_mins: number;
  median_loss_holding_mins: number;
  max_win_streak: number;
  max_loss_streak: number;
  expectancy: number;
  profit_factor: number;
  loss_to_win_ratio: number;
  holding_time_ratio: number;
}

export interface FullReportData {
  generated_at: string;
  overall_performance: KPIs;
  pnl_overview: {
    net_pnl: number;
    gross_pnl: number;
    profit_factor: number;
    roi_pct: number;
    win_rate: number;
  };
  long_vs_short: LongShortData;
  asset_performance: AssetsResponse;
  risk_summary: RiskData;
  drawdown_summary: {
    max_drawdown: number;
    max_drawdown_pct: number;
    current_drawdown: number;
  };
  trading_behavior: BehaviorData;
  market_regimes: MarketRegime[];
  fees_funding: FeesData;
  performance_comparison: any;
  winner_vs_loser: WinnerLoserStats;
  strengths: string[];
  weaknesses: string[];
  actionable_improvements: string[];
}
