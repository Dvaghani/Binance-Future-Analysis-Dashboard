import React, { useState } from 'react';
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
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { api } from '../../services/api';

export const ConnectionModal: React.FC = () => {
  const {
    isConnectionModalOpen,
    setIsConnectionModalOpen,
    status,
    refreshStatus,
    setNotification,
    toggleDemoMode,
  } = useTrading();

  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [publicIp, setPublicIp] = useState<string>('92.206.196.95');
  const [copiedIp, setCopiedIp] = useState(false);

  React.useEffect(() => {
    if (isConnectionModalOpen) {
      api.getPublicIp().then((res) => {
        if (res?.ip) setPublicIp(res.ip);
      }).catch(() => {});
    }
  }, [isConnectionModalOpen]);

  const handleCopyIp = () => {
    navigator.clipboard.writeText(publicIp);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2500);
  };

  if (!isConnectionModalOpen) return null;

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !apiSecret.trim()) {
      setTestResult({ success: false, message: 'Please enter both your API Key and API Secret.' });
      return;
    }

    setIsLoading(true);
    setTestResult(null);
    try {
      const res = await api.testConnection(apiKey.trim(), apiSecret.trim());
      setTestResult({
        success: true,
        message: `Verified! Read-only Futures connection confirmed. Margin balance: $${res.details.totalWalletBalance.toFixed(2)}`,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed. Please verify your keys and network.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConnection = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) return;

    setIsLoading(true);
    try {
      await api.saveConnection(apiKey.trim(), apiSecret.trim());
      await api.triggerSync();
      await toggleDemoMode(false);
      setNotification({
        type: 'success',
        message: 'Binance credentials saved and initial synchronization completed!',
      });
      setIsConnectionModalOpen(false);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to save credentials.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Binance Futures API</h2>
              <p className="text-[11px] text-slate-500 font-medium">Read-Only Analytics Access</p>
            </div>
          </div>
          <button
            onClick={() => setIsConnectionModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Assurance Banner */}
        <div className="mx-6 mt-4 p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-[11px] text-emerald-900 leading-relaxed">
            <span className="font-semibold block mb-0.5">Read-Only Security Guarantee</span>
            This application only queries trade history and balances. It does not have permission to place, modify, or cancel orders, and cannot withdraw funds.
          </div>
        </div>

        {/* Binance IP Whitelist Helper */}
        <div className="mx-6 mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Your Public IP (Binance Whitelist)
            </span>
            <span className="text-xs font-mono font-bold text-slate-900 mt-0.5 block select-all">
              {publicIp}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopyIp}
            className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-md shadow-subtle transition flex items-center gap-1"
          >
            {copiedIp ? (
              <span className="text-emerald-600 font-bold">Copied!</span>
            ) : (
              <span>Copy IP</span>
            )}
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleTestConnection} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Binance API Key
            </label>
            <input
              type="text"
              placeholder="e.g. vmPUZE6mv9SD5VNHk4Hl..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Binance API Secret
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                placeholder="e.g. NwS5n2d16..."
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition pr-9"
                required
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Test Status Feedback */}
          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-tight">{testResult.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Test Connection
            </button>

            <button
              type="button"
              onClick={handleSaveConnection}
              disabled={isLoading || !apiKey || !apiSecret}
              className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-slate-300" />
              Save & Sync
            </button>
          </div>
        </form>

        {/* Current Connection Status Box */}
        {status?.is_connected && (
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Currently Stored Key:</span>
            <span className="font-mono text-slate-700 font-semibold">{status.api_key_masked}</span>
          </div>
        )}
      </div>
    </div>
  );
};
