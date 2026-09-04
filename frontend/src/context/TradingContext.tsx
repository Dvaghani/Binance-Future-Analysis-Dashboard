import React, { createContext, useContext, useState, useEffect } from 'react';
import { AccountStatus } from '../types';
import { api } from '../services/api';

interface NotificationState {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface TradingContextType {
  status: AccountStatus | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isConnectionModalOpen: boolean;
  setIsConnectionModalOpen: (open: boolean) => void;
  isSyncing: boolean;
  syncNow: () => Promise<void>;
  toggleDemoMode: (enableDemo: boolean) => Promise<void>;
  refreshStatus: () => Promise<void>;
  notification: NotificationState | null;
  setNotification: (n: NotificationState | null) => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [activeTab, setActiveTabState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      const valid = ['overview', 'performance', 'trades', 'assets', 'long-short', 'time-analysis', 'behavior', 'risk', 'market', 'calendar', 'reports'];
      if (valid.includes(hash)) return hash;
    }
    return 'overview';
  });

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      window.location.hash = tab;
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const valid = ['overview', 'performance', 'trades', 'assets', 'long-short', 'time-analysis', 'behavior', 'risk', 'market', 'calendar', 'reports'];
      if (valid.includes(hash)) {
        setActiveTabState(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const refreshStatus = async () => {
    try {
      const data = await api.getStatus();
      setStatus(data);
    } catch (e: any) {
      console.error('Failed to load status:', e);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const syncNow = async () => {
    setIsSyncing(true);
    try {
      if (status?.is_demo_mode) {
        await api.resetDemo();
        setNotification({ type: 'success', message: 'Demo dataset refreshed with latest 90-day simulation!' });
      } else {
        const res = await api.triggerSync();
        setNotification({ type: 'success', message: `Synced successfully! Found ${res.new_fills} new trade executions.` });
      }
      await refreshStatus();
    } catch (e: any) {
      setNotification({ type: 'error', message: e.message || 'Synchronization failed' });
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleDemoMode = async (enableDemo: boolean) => {
    try {
      await api.toggleMode(enableDemo);
      await refreshStatus();
      setNotification({
        type: 'info',
        message: enableDemo ? 'Switched to Demo Account data.' : 'Switched to Live Binance Account data.'
      });
    } catch (e: any) {
      setNotification({ type: 'error', message: e.message || 'Failed to toggle mode' });
    }
  };

  // Auto-dismiss notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  return (
    <TradingContext.Provider
      value={{
        status,
        activeTab,
        setActiveTab,
        isConnectionModalOpen,
        setIsConnectionModalOpen,
        isSyncing,
        syncNow,
        toggleDemoMode,
        refreshStatus,
        notification,
        setNotification,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
};
