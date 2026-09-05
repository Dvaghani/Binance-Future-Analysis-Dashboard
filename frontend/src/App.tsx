import React from 'react';
import { TradingProvider, useTrading } from './context/TradingContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ConnectionModal } from './components/modals/ConnectionModal';
import { SyncGuideModal } from './components/modals/SyncGuideModal';

import { OverviewPage } from './pages/OverviewPage';
import { PositionsPage } from './pages/PositionsPage';
import { PerformancePage } from './pages/PerformancePage';
import { TradesPage } from './pages/TradesPage';
import { AssetsPage } from './pages/AssetsPage';
import { LongShortPage } from './pages/LongShortPage';
import { TimeAnalysisPage } from './pages/TimeAnalysisPage';
import { BehaviorPage } from './pages/BehaviorPage';
import { RiskPage } from './pages/RiskPage';
import { MarketPage } from './pages/MarketPage';
import { CalendarPage } from './pages/CalendarPage';
import { ReportsPage } from './pages/ReportsPage';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    activeTab,
    activeAccountId,
    status,
    dataRefreshKey,
    notification,
    setNotification,
  } = useTrading();

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewPage />;
      case 'positions':
        return <PositionsPage />;
      case 'performance':
        return <PerformancePage />;
      case 'trades':
        return <TradesPage />;
      case 'assets':
        return <AssetsPage />;
      case 'long-short':
        return <LongShortPage />;
      case 'time-analysis':
        return <TimeAnalysisPage />;
      case 'behavior':
        return <BehaviorPage />;
      case 'risk':
        return <RiskPage />;
      case 'market':
        return <MarketPage />;
      case 'calendar':
        return <CalendarPage />;
      case 'reports':
        return <ReportsPage />;
      default:
        return <OverviewPage />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        {/* Global Notification Toast */}
        {notification && (
          <div className="fixed bottom-5 right-5 z-50 animate-bounce-subtle">
            <div
              className={`p-3 rounded-xl shadow-lg border flex items-center gap-2.5 text-xs font-semibold ${
                notification.type === 'success'
                  ? 'bg-emerald-900/90 text-white border-emerald-700 backdrop-blur-sm'
                  : notification.type === 'error'
                  ? 'bg-rose-900/90 text-white border-rose-700 backdrop-blur-sm'
                  : 'bg-slate-900/95 dark:bg-slate-800/95 text-white border-slate-800 dark:border-slate-700 backdrop-blur-sm'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : notification.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              ) : (
                <Info className="w-4 h-4 text-indigo-400" />
              )}
              <span>{notification.message}</span>
              <button
                onClick={() => setNotification(null)}
                className="ml-2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Page View */}
        <main
          className="flex-1 pb-16"
          key={`${activeTab}-${activeAccountId}-${status?.is_demo_mode ? 'demo' : 'live'}-${status?.last_sync_time || ''}-${dataRefreshKey}`}
        >
          {renderActiveTab()}
        </main>
      </div>

      {/* Binance Connection Modal */}
      <ConnectionModal />

      {/* Binance Sync & History Guide Modal */}
      <SyncGuideModal />
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <TradingProvider>
        <MainLayout />
      </TradingProvider>
    </ThemeProvider>
  );
}

export default App;
