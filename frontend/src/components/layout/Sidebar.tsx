"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/trades", label: "交易紀錄", icon: "📋" },
  { href: "/strategies", label: "策略管理", icon: "🤖" },
  { href: "/settings", label: "設定", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col min-h-screen">
      <div className="p-4 border-b border-slate-800">
        <h1 className="text-lg font-bold text-white">CryptoTrader</h1>
        <p className="text-xs text-slate-400">Binance Testnet</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <p className="text-xs text-slate-500">v1.0.0</p>
      </div>
    </aside>
  );
}
