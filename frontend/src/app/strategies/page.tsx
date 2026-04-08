"use client";

import { useState } from "react";
import useSWR from "swr";
import StrategyCard from "@/components/strategies/StrategyCard";
import StrategyForm from "@/components/strategies/StrategyForm";
import { api } from "@/lib/api";

export default function StrategiesPage() {
  const [showForm, setShowForm] = useState(false);
  const { data: strategies, mutate } = useSWR("strategies", api.getStrategies);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">策略管理</h1>
          <p className="text-sm text-slate-400 mt-1">
            建立並管理自動交易策略
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
        >
          {showForm ? "取消" : "+ 新增策略"}
        </button>
      </div>

      {showForm && (
        <StrategyForm
          onCreated={() => { mutate(); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {strategies && strategies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {strategies.map((s) => (
            <StrategyCard
              key={s.id}
              strategy={s}
              onUpdate={mutate}
              onDelete={mutate}
            />
          ))}
        </div>
      ) : (
        !showForm && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <p className="text-4xl mb-4">🤖</p>
            <p className="text-slate-400 text-sm">尚無策略，點擊「新增策略」開始自動交易</p>
          </div>
        )
      )}
    </div>
  );
}
