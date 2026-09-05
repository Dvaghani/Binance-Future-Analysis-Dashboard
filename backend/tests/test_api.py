"""
Integration tests for FastAPI REST endpoints.
"""
import unittest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database.db import init_db, SessionLocal
from backend.analytics.demo_data import generate_demo_trades
from backend.database.models import Trade

class TestApiEndpoints(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        init_db()
        db = SessionLocal()
        if db.query(Trade).filter(Trade.is_demo == True).count() == 0:
            trades = generate_demo_trades()
            for t in trades:
                db.add(t)
            db.commit()
        db.close()
        cls.client = TestClient(app)

    def test_status(self):
        res = self.client.get("/api/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("is_demo_mode", data)
        self.assertIn("demo_trades_count", data)

    def test_overview(self):
        res = self.client.get("/api/overview")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("kpis", data)
        self.assertIn("quick_insight", data)
        self.assertIn("risk_score", data)

    def test_equity_curve(self):
        res = self.client.get("/api/equity-curve?timeframe=ALL")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("data", data)
        self.assertGreater(len(data["data"]), 0)

    def test_trades_list(self):
        res = self.client.get("/api/trades?page=1&page_size=10")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("trades", data)
        self.assertIn("total", data)
        self.assertGreater(data["total"], 0)

    def test_assets(self):
        res = self.client.get("/api/assets")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("assets", data)

    def test_long_short(self):
        res = self.client.get("/api/long-short")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("long", data)
        self.assertIn("short", data)
        self.assertIn("insight", data)

    def test_behavior(self):
        res = self.client.get("/api/behavior")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("behaviors", data)
        self.assertIn("flagged_trades", data)

    def test_risk(self):
        res = self.client.get("/api/risk")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("risk_score", data)
        self.assertIn("score_breakdown", data)

    def test_reports(self):
        res = self.client.get("/api/reports")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("overall_performance", data)
        self.assertIn("strengths", data)
        self.assertIn("weaknesses", data)
        self.assertIn("actionable_improvements", data)

    def test_trade_chart(self):
        trades_res = self.client.get("/api/trades?page=1&page_size=1")
        self.assertEqual(trades_res.status_code, 200)
        trade_id = trades_res.json()["trades"][0]["id"]

        chart_res = self.client.get(f"/api/trades/{trade_id}/chart")
        self.assertEqual(chart_res.status_code, 200)
        chart_data = chart_res.json()
        self.assertIn("trade", chart_data)
        self.assertIn("candles", chart_data)
        self.assertIn("entry_index", chart_data)
        self.assertIn("exit_index", chart_data)
        self.assertIn("min_price", chart_data)
        self.assertIn("max_price", chart_data)
        self.assertGreater(len(chart_data["candles"]), 0)
        self.assertEqual(chart_data["trade"]["id"], trade_id)

    def test_accounts_endpoints(self):
        # 1. Test listing accounts
        res = self.client.get("/api/accounts")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("accounts", data)
        self.assertIn("active_account_id", data)
        self.assertGreaterEqual(len(data["accounts"]), 1)

        first_account = data["accounts"][0]
        acc_id = first_account["id"]
        self.assertIn("name", first_account)
        self.assertIn("account_balance", first_account)
        self.assertIn("live_trades_count", first_account)

        # 2. Test updating account name
        put_res = self.client.put(f"/api/accounts/{acc_id}", json={"name": "Primary Trading"})
        self.assertEqual(put_res.status_code, 200)

        # 3. Test activating specific account
        act_res = self.client.post(f"/api/accounts/{acc_id}/activate")
        self.assertEqual(act_res.status_code, 200)
        act_data = act_res.json()
        self.assertEqual(act_data["active_account_id"], acc_id)

        # 4. Test activating All Accounts (id 0)
        all_res = self.client.post("/api/accounts/0/activate")
        self.assertEqual(all_res.status_code, 200)
        all_data = all_res.json()
        self.assertEqual(all_data["active_account_id"], 0)
        self.assertEqual(all_data["active_account_name"], "All Live Accounts")

        # 5. Check status in All Accounts mode
        status_res = self.client.get("/api/status")
        self.assertEqual(status_res.status_code, 200)
        status_data = status_res.json()
        self.assertEqual(status_data["active_account_id"], 0)
        self.assertEqual(status_data["active_account_name"], "All Live Accounts")
        self.assertIn("accounts", status_data)

        # Reset name back to Main Account
        self.client.put(f"/api/accounts/{acc_id}", json={"name": "Main Account"})
        # Activate primary account again
        self.client.post(f"/api/accounts/{acc_id}/activate")

    def test_trades_account_field(self):
        res = self.client.get("/api/trades?page=1&page_size=5")
        self.assertEqual(res.status_code, 200)
        trades = res.json()["trades"]
        self.assertGreater(len(trades), 0)
        first_trade = trades[0]
        self.assertIn("account_name", first_trade)
        self.assertIn("account_id", first_trade)

    def test_connection_validation(self):
        # Empty credentials should return 400 with descriptive detail
        res = self.client.post("/api/connection/test", json={"api_key": "", "api_secret": ""})
        self.assertEqual(res.status_code, 400)
        self.assertIn("cannot be empty", res.json()["detail"])

        res2 = self.client.post("/api/accounts", json={"name": "Test", "api_key": "   ", "api_secret": ""})
        self.assertEqual(res2.status_code, 400)
        self.assertIn("cannot be empty", res2.json()["detail"])

    from unittest.mock import patch

    @patch("backend.api.routes.BinanceFuturesClient")
    def test_create_account_schema(self, mock_client_cls):
        mock_instance = mock_client_cls.return_value
        mock_instance.test_connection.return_value = {
            "totalWalletBalance": 5420.50,
            "totalUnrealizedProfit": 12.30,
            "totalMarginBalance": 5432.80
        }
        res = self.client.post("/api/accounts", json={
            "name": "Integration Test Account",
            "api_key": "dummyapikey12345678",
            "api_secret": "dummyapisecret12345678"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("account_id", data)
        self.assertIsInstance(data["account_id"], int)
        self.assertIn("balance", data)
        self.assertEqual(data["balance"], 5420.50)
        self.assertIn("account", data)
        self.assertEqual(data["account"]["name"], "Integration Test Account")

        # Clean up created test account
        acc_id = data["account_id"]
        del_res = self.client.delete(f"/api/accounts/{acc_id}")
        self.assertEqual(del_res.status_code, 200)

    @patch("backend.api.routes.sync_binance_data")
    def test_sync_with_days(self, mock_sync):
        mock_sync.return_value = {
            "status": "success",
            "balance": 10000.0,
            "new_fills": 5,
            "new_income": 3,
            "lookback_days": 60,
            "last_sync": "2026-09-05 12:00:00 UTC"
        }
        res = self.client.post("/api/sync?days=60")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        mock_sync.assert_called()

    def test_positions_endpoint_demo(self):
        # Ensure in demo mode
        self.client.post("/api/mode/toggle", json={"is_demo_mode": True})

        res = self.client.get("/api/positions")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("is_demo_mode"))
        self.assertIn("positions", data)
        self.assertGreaterEqual(len(data["positions"]), 1)
        self.assertIn("total_exposure", data)
        self.assertIn("total_unrealized_pnl", data)
        self.assertIn("margin_utilization_pct", data)
        self.assertIn("highest_risk_tier", data)
        self.assertIn("next_funding_time", data)
        self.assertIn("funding_countdown_seconds", data)

        pos = data["positions"][0]
        self.assertIn("symbol", pos)
        self.assertIn("side", pos)
        self.assertIn("entry_price", pos)
        self.assertIn("mark_price", pos)
        self.assertIn("liquidation_price", pos)
        self.assertIn("liquidation_distance_pct", pos)
        self.assertIn("risk_tier", pos)
        self.assertIn("leverage", pos)
        self.assertIn("unrealized_pnl", pos)
        self.assertIn("funding_rate", pos)
        self.assertIn("estimated_funding_fee", pos)
        self.assertIn(pos["risk_tier"], ["Safe", "Moderate", "Elevated", "Critical"])

if __name__ == "__main__":
    unittest.main()


