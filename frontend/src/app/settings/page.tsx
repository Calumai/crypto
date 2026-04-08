"use client";

import { useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import type { ApiKey } from "@/types";

export default function SettingsPage() {
  const { data: keys, mutate } = useSWR("api-keys", api.getApiKeys);
  const [form, setForm] = useState({
    api_key: "",
    secret_key: "",
    is_testnet: true,
  });
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<Record<number, string>>({});
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.createApiKey({ exchange: "binance", ...form });
      mutate();
      setForm({ api_key: "", secret_key: "", is_testnet: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "儲存失敗");
    } finally {
      setLoading(false);
    }
  }

  async function testKey(key: ApiKey) {
    setTestResult((prev) => ({ ...prev, [key.id]: "測試中..." }));
    try {
      const result = await api.testApiKey(key.id);
      setTestResult((prev) => ({
        ...prev,
        [key.id]: `連線成功 — USDT 餘額: ${result.usdt_balance.toFixed(2)}`,
      }));
    } catch (e: unknown) {
      setTestResult((prev) => ({
        ...prev,
        [key.id]: `失敗: ${e instanceof Error ? e.message : "未知錯誤"}`,
      }));
    }
  }

  async function deleteKey(id: number) {
    if (!confirm("確定刪除此 API Key？")) return;
    await api.deleteApiKey(id);
    mutate();
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-bold">設定</h1>
        <p className="text-sm text-slate-400 mt-1">管理 Binance API 金鑰</p>
      </div>

      {/* Existing keys */}
      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">已儲存的 API Key</h2>
        {keys && keys.length > 0 ? (
          <div className="space-y-3">
            {keys.map((k) => (
              <div key={k.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Binance</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${k.is_testnet ? "bg-yellow-900 text-yellow-300" : "bg-green-900 text-green-300"}`}>
                        {k.is_testnet ? "Testnet" : "正式"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      {k.api_key.slice(0, 8)}...{k.api_key.slice(-4)}
                    </p>
                    {k.created_at && (
                      <p className="text-xs text-slate-500 mt-0.5">{formatDate(k.created_at)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteKey(k.id)}
                    className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                  >
                    刪除
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => testKey(k)}
                    className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    測試連線
                  </button>
                  {testResult[k.id] && (
                    <span className={`text-xs ${testResult[k.id].startsWith("連線成功") ? "text-green-400" : "text-red-400"}`}>
                      {testResult[k.id]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-500 text-sm">
            尚未設定 API Key
          </div>
        )}
      </div>

      {/* Add new key */}
      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">新增 API Key</h2>
        <form onSubmit={submit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">API Key</label>
            <input
              required
              value={form.api_key}
              onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
              placeholder="從 Binance 複製 API Key"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Secret Key</label>
            <input
              required
              type="password"
              value={form.secret_key}
              onChange={(e) => setForm((f) => ({ ...f, secret_key: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
              placeholder="Secret Key"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_testnet}
                onChange={(e) => setForm((f) => ({ ...f, is_testnet: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">使用 Testnet (測試網)</span>
            </label>
          </div>
          {form.is_testnet && (
            <p className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-900 rounded-lg p-3">
              Testnet API Key 請從 testnet.binance.vision 取得，使用假幣進行測試，不會有實際損失。
            </p>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "儲存中..." : "儲存 API Key"}
          </button>
        </form>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-2">安全說明</h3>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>• API Key 在儲存前會以 Fernet 加密</li>
          <li>• 建議只開啟 Spot 交易權限，不開啟提款權限</li>
          <li>• Testnet 環境使用假幣，適合策略測試</li>
        </ul>
      </div>
    </div>
  );
}
