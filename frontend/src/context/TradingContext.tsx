import React, { createContext, useContext, useState, useEffect } from 'react';
import { AccountItem, AccountStatus } from '../types';
import { api } from '../services/api';

interface NotificationState {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface TradingContextType {
  status: AccountStatus | null;
  accounts: AccountItem[];
  activeAccountId: number | null;
  activeAccountName: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isConnectionModalOpen: boolean;
  setIsConnectionModalOpen: (open: boolean) => void;
  connectionModalTab: 'accounts' | 'connect';
  setConnectionModalTab: (tab: 'accounts' | 'connect') => void;
  openConnectionModal: (tab?: 'accounts' | 'connect') => void;
  isSyncGuideOpen: boolean;
  setIsSyncGuideOpen: (open: boolean) => void;
  lookbackDays: number;
  setLookbackDays: (days: number) => void;
  isSyncing: boolean;
  dataRefreshKey: number;
  triggerRefresh: () => void;
  syncNow: (days?: number) => Promise<void>;
  syncAccount: (accountId: number, days?: number) => Promise<void>;
  syncAllAccounts: (days?: number) => Promise<void>;
  switchAccount: (accountId: number) => Promise<void>;
  deleteAccount: (accountId: number) => Promise<void>;
  toggleDemoMode: (enableDemo: boolean) => Promise<void>;
  refreshStatus: () => Promise<void>;
  notification: NotificationState | null;
  setNotification: (n: NotificationState | null) => void;
}

function formatError(err: any, fallback: string = 'Operation failed'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (typeof err.message === 'string') return err.message;
  if (typeof err.detail === 'string') return err.detail;
  if (Array.isArray(err.detail)) {
    return err.detail.map((e: any) => e.msg || JSON.stringify(e)).join('; ');
  }
  try {
    return JSON.stringify(err);
  } catch {
    return fallback;
  }
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<number | null>(null);
  const [activeAccountName, setActiveAccountName] = useState<string>('Main Account');
  const [connectionModalTab, setConnectionModalTab] = useState<'accounts' | 'connect'>('accounts');
  const [isSyncGuideOpen, setIsSyncGuideOpen] = useState<boolean>(false);
  const [lookbackDays, setLookbackDays] = useState<number>(30);
  const [dataRefreshKey, setDataRefreshKey] = useState<number>(0);

  const triggerRefresh = () => {
    setDataRefreshKey((k) => k + 1);
  };

  const [activeTab, setActiveTabState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      const valid = ['overview', 'positions', 'performance', 'trades', 'assets', 'long-short', 'time-analysis', 'behavior', 'risk', 'market', 'calendar', 'reports'];
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
      const valid = ['overview', 'positions', 'performance', 'trades', 'assets', 'long-short', 'time-analysis', 'behavior', 'risk', 'market', 'calendar', 'reports'];
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

  const openConnectionModal = (tab?: 'accounts' | 'connect') => {
    if (tab) {
      setConnectionModalTab(tab);
    } else {
      // Default to connect if no accounts exist, otherwise accounts overview
      setConnectionModalTab(accounts.length === 0 ? 'connect' : 'accounts');
    }
    setIsConnectionModalOpen(true);
  };

  const refreshStatus = async () => {
    try {
      const data = await api.getStatus();
      setStatus(data);
      if (data.accounts) {
        setAccounts(data.accounts);
      }
      setActiveAccountId(data.active_account_id ?? null);
      setActiveAccountName(data.active_account_name || 'Main Account');
      setDataRefreshKey((k) => k + 1);
    } catch (e: any) {
      console.error('Failed to load status:', e);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const switchAccount = async (accountId: number) => {
    try {
      const res = await api.activateAccount(accountId);
      setActiveAccountId(res.active_account_id);
      setActiveAccountName(res.active_account_name);
      setNotification({
        type: 'info',
        message: `Active account switched to ${res.active_account_name}.`,
      });
      await refreshStatus();
    } catch (e: any) {
      setNotification({ type: 'error', message: formatError(e, 'Failed to switch account') });
    }
  };

  const syncAccount = async (accountId: number, days?: number) => {
    const targetDays = days || lookbackDays;
    setIsSyncing(true);
    try {
      const res = await api.syncAccount(accountId, targetDays);
      const acc = accounts.find((a) => a.id === accountId);
      const name = acc ? acc.name : `Account #${accountId}`;
      setNotification({
        type: 'success',
        message: `Synced ${name} (${targetDays}D history)! Found ${res.new_fills} new executions.`,
      });
      await refreshStatus();
    } catch (e: any) {
      setNotification({ type: 'error', message: formatError(e, 'Account sync failed') });
    } finally {
      setIsSyncing(false);
    }
  };

  const syncAllAccounts = async (days?: number) => {
    const targetDays = days || lookbackDays;
    setIsSyncing(true);
    try {
      const res = await api.syncAllAccounts(targetDays);
      setNotification({
        type: 'success',
        message: `Multi-Account Sync Complete (${targetDays}D)! Found ${res.total_new_fills} new fills across ${res.synced_accounts} connected account(s).`,
      });
      await refreshStatus();
    } catch (e: any) {
      setNotification({ type: 'error', message: formatError(e, 'Multi-account sync failed') });
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteAccount = async (accountId: number) => {
    try {
      const acc = accounts.find((a) => a.id === accountId);
      const name = acc ? acc.name : `Account #${accountId}`;
      await api.deleteAccount(accountId);
      setNotification({
        type: 'info',
        message: `Account "${name}" and its trade records were removed.`,
      });
      await refreshStatus();
    } catch (e: any) {
      setNotification({ type: 'error', message: formatError(e, 'Failed to remove account') });
    }
  };

  const syncNow = async (days?: number) => {
    const targetDays = days || lookbackDays;
    setIsSyncing(true);
    try {
      if (status?.is_demo_mode) {
        await api.resetDemo();
        setNotification({ type: 'success', message: 'Demo dataset refreshed with latest 90-day simulation!' });
      } else if (activeAccountId === 0 || activeAccountId === null) {
        const res = await api.triggerSync(targetDays);
        const fills = (res as any).total_new_fills ?? (res as any).new_fills ?? 0;
        setNotification({ type: 'success', message: `Synced all live accounts (${targetDays}D)! Found ${fills} new executions.` });
      } else {
        const res = await api.triggerSync(targetDays);
        setNotification({ type: 'success', message: `Synced successfully (${targetDays}D)! Found ${res.new_fills} new executions.` });
      }
      await refreshStatus();
    } catch (e: any) {
      setNotification({ type: 'error', message: formatError(e, 'Synchronization failed') });
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
      setNotification({ type: 'error', message: formatError(e, 'Failed to toggle mode') });
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
        accounts,
        activeAccountId,
        activeAccountName,
        activeTab,
        setActiveTab,
        isConnectionModalOpen,
        setIsConnectionModalOpen,
        connectionModalTab,
        setConnectionModalTab,
        openConnectionModal,
        isSyncGuideOpen,
        setIsSyncGuideOpen,
        lookbackDays,
        setLookbackDays,
        isSyncing,
        dataRefreshKey,
        triggerRefresh,
        syncNow,
        syncAccount,
        syncAllAccounts,
        switchAccount,
        deleteAccount,
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

