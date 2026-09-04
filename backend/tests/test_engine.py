"""
Unit tests for the Analytics Engine and Behavioral Detectors.
"""
import unittest
from datetime import datetime, timedelta
from backend.database.models import Trade
from backend.analytics.engine import (
    calculate_kpis,
    calculate_long_short_performance,
    calculate_asset_performance,
    calculate_behavioral_patterns,
    calculate_risk_analysis,
    calculate_fees_and_funding,
    calculate_time_analysis,
    calculate_winner_loser_stats,
    calculate_equity_curve
)
from backend.analytics.demo_data import generate_demo_trades

class TestAnalyticsEngine(unittest.TestCase):

    def setUp(self):
        self.trades = generate_demo_trades()

    def test_demo_trades_generation(self):
        self.assertGreaterEqual(len(self.trades), 100, "Should generate at least 100 demo trades")
        symbols = set(t.symbol for t in self.trades)
        self.assertTrue("BTCUSDT" in symbols)
        self.assertTrue("ETHUSDT" in symbols)

    def test_calculate_kpis(self):
        kpis = calculate_kpis(self.trades, current_balance=10000.0)
        self.assertGreater(kpis["total_trades"], 0)
        self.assertIn("win_rate", kpis)
        self.assertIn("profit_factor", kpis)
        self.assertIn("max_drawdown", kpis)
        self.assertIn("trajectory", kpis)
        self.assertTrue(0 <= kpis["win_rate"] <= 100)

    def test_long_short_performance(self):
        ls = calculate_long_short_performance(self.trades)
        self.assertIn("long", ls)
        self.assertIn("short", ls)
        self.assertIn("insight", ls)
        self.assertGreater(ls["long"]["trades"], 0)
        self.assertGreater(ls["short"]["trades"], 0)
        self.assertTrue("Your" in ls["insight"] or "Long" in ls["insight"])

    def test_asset_performance(self):
        assets = calculate_asset_performance(self.trades)
        self.assertGreaterEqual(len(assets["assets"]), 3)
        self.assertIsNotNone(assets["top_driver"])
        self.assertIsNotNone(assets["top_dragger"])

    def test_behavioral_patterns(self):
        patterns = calculate_behavioral_patterns(self.trades)
        self.assertIn("behaviors", patterns)
        self.assertGreater(len(patterns["behaviors"]), 0)
        keys = [b["key"] for b in patterns["behaviors"]]
        self.assertIn("REVENGE_TRADING", keys)
        self.assertIn("OVERSIZED", keys)
        self.assertIn("HELD_LOSER_TOO_LONG", keys)

    def test_risk_analysis(self):
        risk = calculate_risk_analysis(self.trades, balance=10000.0)
        self.assertIn("risk_score", risk)
        self.assertTrue(0 <= risk["risk_score"] <= 100)
        self.assertIn("score_breakdown", risk)
        self.assertIn("drawdown_health", risk["score_breakdown"])

    def test_fees_and_funding(self):
        fees = calculate_fees_and_funding(self.trades)
        self.assertIn("total_fees", fees)
        self.assertIn("net_funding", fees)
        self.assertIn("total_drag_pct", fees)

    def test_time_analysis(self):
        time_data = calculate_time_analysis(self.trades)
        self.assertEqual(len(time_data["hourly"]), 24)
        self.assertEqual(len(time_data["daily"]), 7)
        self.assertGreater(len(time_data["sessions"]), 0)

    def test_equity_curve(self):
        curve_all = calculate_equity_curve(self.trades, "ALL")
        self.assertGreater(len(curve_all), 10)
        self.assertIn("equity", curve_all[0])
        self.assertIn("drawdown", curve_all[0])

    def test_sub_thousand_account_drawdown(self):
        # A $100 account with a $10 loss should have a ~9-10% drawdown, NOT ~1%
        trade1 = Trade(
            id="t1",
            symbol="BTCUSDT",
            side="LONG",
            entry_time=datetime(2026, 1, 1, 10, 0),
            exit_time=datetime(2026, 1, 1, 11, 0),
            entry_price=100.0,
            exit_price=90.0,
            quantity=1.0,
            position_value=100.0,
            leverage=1,
            gross_pnl=-10.0,
            pnl_percentage=-10.0,
            commission=0.0,
            funding_fees=0.0,
            net_pnl=-10.0,
            duration_seconds=3600,
            is_winner=False
        )
        # current_balance = 90 (started with 100, lost 10)
        kpis = calculate_kpis([trade1], current_balance=90.0, unrealized_pnl=0.0)
        self.assertEqual(kpis["max_drawdown"], 10.0)
        # Starting equity is 100, drop to 90 -> 10%
        self.assertAlmostEqual(kpis["max_drawdown_pct"], 10.0, delta=0.5)

        risk = calculate_risk_analysis([trade1], balance=90.0, unrealized_pnl=0.0)
        self.assertEqual(risk["max_drawdown"], 10.0)
        self.assertAlmostEqual(risk["max_drawdown_pct"], 10.0, delta=0.5)

    def test_initial_loss_counts_towards_drawdown(self):
        trade1 = Trade(
            id="t1",
            symbol="ETHUSDT",
            side="LONG",
            entry_time=datetime(2026, 1, 1, 10, 0),
            exit_time=datetime(2026, 1, 1, 11, 0),
            entry_price=100.0,
            exit_price=95.0,
            quantity=1.0,
            position_value=100.0,
            leverage=1,
            gross_pnl=-5.0,
            pnl_percentage=-5.0,
            commission=0.0,
            funding_fees=0.0,
            net_pnl=-5.0,
            duration_seconds=3600,
            is_winner=False
        )
        curve = calculate_equity_curve([trade1], "ALL", current_balance=95.0)
        self.assertEqual(len(curve), 1)
        self.assertEqual(curve[0]["drawdown"], 5.0)
        self.assertAlmostEqual(curve[0]["drawdown_pct"], 5.0, delta=0.1)

if __name__ == "__main__":
    unittest.main()
