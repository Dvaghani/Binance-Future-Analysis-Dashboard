import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Lock,
  Plus,
  Trash2,
  Edit2,
  Check,
  Layers,
  Wallet,
  ArrowRight,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { api } from '../../services/api';

export const ConnectionModal: React.FC = () => {
  const {
    isConnectionModalOpen,
    setIsConnectionModalOpen,
    connectionModalTab,
    setConnectionModalTab,
    accounts,
    activeAccountId,
    switchAccount,
    syncAccount,
    syncAllAccounts,
    deleteAccount,
    refreshStatus,
    setNotification,
    toggleDemoMode,
    isSyncing,
    lookbackDays,
    setLookbackDays,
    setIsSyncGuideOpen,
  } = useTrading();

  // Form State for Connecting New Account
  const [accountName, setAccountName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [publicIp, setPublicIp] = useState<string>('92.206.196.95');
  const [copiedIp, setCopiedIp] = useState(false);
  const [initialLookbackDays, setInitialLookbackDays] = useState<number>(30);

  // Edit Account Name State
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    if (isConnectionModalOpen) {
      api.getPublicIp().then((res) => {
        if (res?.ip) setPublicIp(res.ip);
      }).catch(() => {});
      // Pre-fill suggested account name
      setAccountName(`Account ${accounts.length + 1}`);
    }
  }, [isConnectionModalOpen, accounts.length]);

  const handleCopyIp = () => {
    navigator.clipboard.writeText(publicIp);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2500);
  };

  if (!isConnectionModalOpen) return null;

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = apiKey.trim();
    const secret = apiSecret.trim();
    if (!key || !secret) {
      setTestResult({ success: false, message: 'Please enter both API Key and API Secret.' });
      return;
    }

    setIsLoading(true);
    setTestResult(null);
    try {
      const res = await api.testConnection(key, secret);
      const bal =
        res.details?.totalWalletBalance ??
        res.details?.totalMarginBalance ??
        res.details?.availableBalance ??
        0;
      setTestResult({
        success: true,
        message: `Verified! Read-only Futures connection confirmed. Margin balance: $${Number(bal).toFixed(2)}`,
      });
    } catch (err: any) {
      const errorMsg =
        typeof err?.message === 'string'
          ? err.message
          : typeof err?.detail === 'string'
          ? err.detail
          : typeof err === 'string'
          ? err
          : 'Connection test failed. Please verify your keys and network.';
      setTestResult({
        success: false,
        message: errorMsg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAndConnect = async () => {
    const key = apiKey.trim();
    const secret = apiSecret.trim();
    if (!key || !secret) {
      setTestResult({ success: false, message: 'Please enter both API Key and API Secret.' });
      return;
    }

    setIsLoading(true);
    setTestResult(null);
    try {
      const name = accountName.trim() || `Account ${accounts.length + 1}`;
      const res = await api.createAccount({
        name,
        api_key: key,
        api_secret: secret,
        lookback_days: initialLookbackDays,
      });

      const newAccountId = res.account_id || (res as any).account?.id;

      // Switch active account to the newly added account
      if (newAccountId) {
        await switchAccount(newAccountId);
      } else {
        await toggleDemoMode(false);
        await refreshStatus();
      }

      setNotification({
        type: 'success',
        message: `Account "${name}" connected and synchronized successfully!`,
      });

      // Clear fields and close modal to immediately display the new account dashboard
      setApiKey('');
      setApiSecret('');
      setAccountName('');
      setTestResult(null);
      setIsConnectionModalOpen(false);
    } catch (err: any) {
      const errorMsg =
        typeof err?.message === 'string'
          ? err.message
          : typeof err?.detail === 'string'
          ? err.detail
          : typeof err === 'string'
          ? err
          : 'Failed to save account credentials.';
      setTestResult({
        success: false,
        message: errorMsg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartRename = (id: number, currentName: string) => {
    setEditingAccountId(id);
    setEditNameValue(currentName);
  };

  const handleSaveRename = async (id: number) => {
    if (!editNameValue.trim()) return;
    try {
      await api.updateAccount(id, { name: editNameValue.trim() });
      await refreshStatus();
      setEditingAccountId(null);
      setNotification({ type: 'success', message: 'Account renamed successfully.' });
    } catch (err: any) {
      const errorMsg =
        typeof err?.message === 'string'
          ? err.message
          : typeof err?.detail === 'string'
          ? err.detail
          : typeof err === 'string'
          ? err
          : 'Failed to rename account';
      setNotification({ type: 'error', message: errorMsg });
    }
  };

  const handleDelete = async (id: number) => {
    await deleteAccount(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200">
              <KeyRound className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Binance Futures Accounts</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Manage read-only API connections & multi-account aggregation
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsConnectionModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 flex border-b border-slate-100 dark:border-slate-800 gap-2 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={() => setConnectionModalTab('accounts')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              connectionModalTab === 'accounts'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Connected Accounts</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
              {accounts.length}
            </span>
          </button>

          <button
            onClick={() => setConnectionModalTab('connect')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              connectionModalTab === 'connect'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect New Account</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {connectionModalTab === 'accounts' ? (
            /* TAB 1: CONNECTED ACCOUNTS LIST */
            <div className="space-y-4">
              {/* Aggregate Action Bar */}
              {accounts.length > 1 && (
                <div className="p-3.5 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/30 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        All Live Accounts Combined
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        View merged portfolio metrics across all {accounts.length} accounts
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => syncAllAccounts()}
                      disabled={isSyncing}
                      className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 rounded-lg shadow-xs transition flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>Sync All</span>
                    </button>
                    <button
                      onClick={() => syncAllAccounts(90)}
                      disabled={isSyncing}
                      className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 rounded-lg shadow-xs transition flex items-center gap-1.5"
                      title="Run 90-Day Sliding Window Deep Sync across all accounts"
                    >
                      <Zap className="w-3 h-3 text-indigo-500" />
                      <span>Deep Sync 90D</span>
                    </button>
                    <button
                      onClick={() => switchAccount(0)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                        activeAccountId === 0
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200'
                      }`}
                    >
                      {activeAccountId === 0 ? 'Active View' : 'Select All'}
                    </button>
                  </div>
                </div>
              )}

              {/* Accounts List */}
              {accounts.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center text-slate-400 mb-3">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Live Accounts Connected</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                    Connect your read-only Binance Futures API keys to analyze trade executions, fees, and equity in real-time.
                  </p>
                  <button
                    onClick={() => setConnectionModalTab('connect')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md transition inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Connect First Account</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map((acc) => {
                    const isActive = activeAccountId === acc.id;
                    const isEditing = editingAccountId === acc.id;
                    const isConfirmingDelete = confirmDeleteId === acc.id;

                    return (
                      <div
                        key={acc.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isActive
                            ? 'border-emerald-500/80 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-750'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          {/* Account Identity */}
                          <div className="min-w-0 flex-1">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editNameValue}
                                  onChange={(e) => setEditNameValue(e.target.value)}
                                  className="px-2 py-1 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveRename(acc.id)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingAccountId(null)}
                                  className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                  {acc.name}
                                </span>
                                <button
                                  onClick={() => handleStartRename(acc.id, acc.name)}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"
                                  title="Rename Account"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                {isActive && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Active Account
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Financial Details */}
                            <div className="mt-2 grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800/80">
                              <div>
                                <div className="text-[10px] uppercase font-semibold text-slate-400">Balance</div>
                                <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                                  ${acc.account_balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase font-semibold text-slate-400">Equity</div>
                                <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                                  ${acc.equity?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase font-semibold text-slate-400">Trades</div>
                                <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                                  {acc.live_trades_count ?? 0}
                                </div>
                              </div>
                            </div>

                            {/* Masked Key & Sync time */}
                            <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              <span>Key: {acc.api_key_masked}</span>
                              <span>&bull;</span>
                              <span>
                                {acc.last_sync_time
                                  ? `Synced: ${new Date(acc.last_sync_time).toLocaleTimeString()}`
                                  : 'Not synced yet'}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons Column */}
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            {!isActive ? (
                              <button
                                onClick={() => switchAccount(acc.id)}
                                className="px-3 py-1.5 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1"
                              >
                                <span>Switch To</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <div className="px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Selected</span>
                              </div>
                            )}

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => syncAccount(acc.id)}
                                disabled={isSyncing}
                                title="Sync Account"
                                className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition disabled:opacity-50"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                              </button>

                              <button
                                onClick={() => syncAccount(acc.id, 90)}
                                disabled={isSyncing}
                                title="Run 90-Day Sliding Window Deep Sync"
                                className="px-2 py-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg border border-indigo-200 dark:border-indigo-800 transition disabled:opacity-50 flex items-center gap-1"
                              >
                                <Zap className="w-3 h-3 text-indigo-500" />
                                <span>90D</span>
                              </button>

                              {isConfirmingDelete ? (
                                <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 p-1 rounded-lg border border-rose-200 dark:border-rose-900">
                                  <button
                                    onClick={() => handleDelete(acc.id)}
                                    className="px-2 py-0.5 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-500 rounded"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="p-1 text-slate-400 hover:text-slate-600"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(acc.id)}
                                  title="Delete Account"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-slate-200 dark:border-slate-700 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Lifetime History & Sync Guide Link */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Need trade records older than 90 days?</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSyncGuideOpen(true)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <span>View CSV Guide</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            /* TAB 2: CONNECT NEW ACCOUNT */
            <div className="space-y-4">
              {/* Security Assurance Banner */}
              <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed">
                  <span className="font-bold block mb-0.5">Read-Only Security Guarantee</span>
                  This analytics dashboard requires only read permissions to sync trade execution history and margins. It has zero capability to place orders or initiate withdrawals.
                </div>
              </div>

              {/* Binance IP Whitelist Helper */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 block">
                    Your Public IP (Binance Whitelist)
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5 block select-all">
                    {publicIp}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyIp}
                  className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-md shadow-xs transition flex items-center gap-1"
                >
                  {copiedIp ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied!</span>
                  ) : (
                    <span>Copy IP</span>
                  )}
                </button>
              </div>

              {/* Connection Form */}
              <form onSubmit={handleTestConnection} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Account Friendly Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Binance VIP, Scalp Bot, Account #2"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Binance API Key
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. vmPUZE6mv9SD5VNHk4Hl..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Binance API Secret
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      placeholder="e.g. NwS5n2d16..."
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition pr-9"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Initial Sync Lookback Period */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Initial History Lookback Window
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsSyncGuideOpen(true)}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <HelpCircle className="w-3 h-3" />
                      <span>Why is API max 90 days?</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { val: 7, label: '7 Days', sub: 'Fast' },
                      { val: 30, label: '30 Days', sub: 'Default' },
                      { val: 60, label: '60 Days', sub: 'Deep' },
                      { val: 90, label: '90 Days', sub: 'Max API' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setInitialLookbackDays(opt.val)}
                        className={`py-1.5 px-2 rounded-lg border text-center transition ${
                          initialLookbackDays === opt.val
                            ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold ring-1 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="text-xs">{opt.label}</div>
                        <div className="text-[9px] opacity-70">{opt.sub}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Automatically queries Binance in consecutive 7-day sliding batches to retrieve all executions.
                  </p>
                </div>

                {/* Test Feedback */}
                {testResult && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                      testResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <span className="leading-tight">{testResult.message}</span>
                  </div>
                )}

                {/* Form Buttons */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isLoading || !apiKey || !apiSecret}
                    className="flex-1 py-2.5 px-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    Test Connection
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAndConnect}
                    disabled={isLoading || !apiKey || !apiSecret}
                    className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5 text-indigo-200" />
                    Connect & Sync
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

