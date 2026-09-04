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

if __name__ == "__main__":
    unittest.main()
