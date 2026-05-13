"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useStore } from "@/lib/store-api";

interface AnalyticsSummary {
  aiOrders: number;
  menuOrders: number;
  aiRevenue: number;
  menuRevenue: number;
  aiAOV: number;
  menuAOV: number;
  aiConversion: number;
  aiAttachRate: number;
  chatSessions: number;
  revenueLift: number;
}

interface RecommendedDish {
  id: string;
  name: string;
  count: number;
  addedToCart: number;
}

interface NotFoundQuery {
  query: string;
  count: number;
}

interface RevenueDay {
  date: string;
  aiRevenue: number;
  menuRevenue: number;
}

interface AnalyticsData {
  period: { days: number };
  summary: AnalyticsSummary;
  revenueByDay: RevenueDay[];
  topRecommended: RecommendedDish[];
  topNotFound: NotFoundQuery[];
}

interface AnalyticsPanelProps {
  onClose: () => void;
}

const PERIOD_OPTIONS = [
  { days: 7, label: "7 дней" },
  { days: 30, label: "30 дней" },
  { days: 90, label: "90 дней" },
  { days: 0, label: "Всё время" },
];

function formatPrice(price: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(price)) + " ₽";
}

function formatPercent(value: number): string {
  return value.toFixed(1) + "%";
}

export function AnalyticsPanel({ onClose }: AnalyticsPanelProps) {
  const { state } = useStore();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(30);

  const fetchAnalytics = useCallback(async () => {
    if (!state.activeOrganizationId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/analytics/dashboard?days=${period}`, {
        headers: { "x-organization-id": state.activeOrganizationId },
      });
      if (!res.ok) throw new Error("Failed to load analytics");
      const json = await res.json();
      setData(json);
    } catch {
      setError("Не удалось загрузить аналитику");
    } finally {
      setLoading(false);
    }
  }, [state.activeOrganizationId, period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const maxRevenue = data
    ? Math.max(...data.revenueByDay.map((d) => Math.max(d.aiRevenue, d.menuRevenue)), 1)
    : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg h-full overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Аналитика</h2>
            <p className="text-sm text-gray-500">Метрики эффективности AI помощника</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Period selector */}
        <div className="px-6 py-3 border-b border-gray-100 flex gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setPeriod(opt.days)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                period === opt.days
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          {data && !loading && (
            <>
              {/* Key metrics */}
              <div className="grid grid-cols-2 gap-4">
                <MetricCard
                  label="AI Конверсия"
                  value={formatPercent(data.summary.aiConversion)}
                  sub={`${data.summary.aiOrders} заказов из ${data.summary.chatSessions} сессий`}
                  color="blue"
                />
                <MetricCard
                  label="AI Attach Rate"
                  value={formatPercent(data.summary.aiAttachRate)}
                  sub={`Сессий чата: ${data.summary.chatSessions}`}
                  color="purple"
                />
                <MetricCard
                  label="AI Revenue"
                  value={formatPrice(data.summary.aiRevenue)}
                  sub={`${data.summary.aiOrders} заказов`}
                  color="green"
                />
                <MetricCard
                  label="Menu Revenue"
                  value={formatPrice(data.summary.menuRevenue)}
                  sub={`${data.summary.menuOrders} заказов`}
                  color="gray"
                />
              </div>

              {/* AOV comparison */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Средний чек (AOV)</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">AI Чат</span>
                      <span className="text-sm font-semibold text-blue-600">{formatPrice(data.summary.aiAOV)}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${Math.max(data.summary.aiAOV, data.summary.menuAOV) > 0 ? (data.summary.aiAOV / Math.max(data.summary.aiAOV, data.summary.menuAOV)) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">QR Меню</span>
                      <span className="text-sm font-semibold text-gray-600">{formatPrice(data.summary.menuAOV)}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-400 rounded-full"
                        style={{
                          width: `${Math.max(data.summary.aiAOV, data.summary.menuAOV) > 0 ? (data.summary.menuAOV / Math.max(data.summary.aiAOV, data.summary.menuAOV)) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Revenue by day chart */}
              {data.revenueByDay.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Выручка по дням</h3>
                  <div className="space-y-1.5">
                    {data.revenueByDay.slice(-14).map((day) => (
                      <div key={day.date} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-20 flex-shrink-0">
                          {day.date.slice(5)}
                        </span>
                        <div className="flex-1 flex gap-0.5 h-5">
                          <div
                            className="bg-blue-400 rounded-sm min-w-[2px]"
                            style={{ width: `${(day.aiRevenue / maxRevenue) * 100}%`, transition: "width 0.3s" }}
                            title={`AI: ${formatPrice(day.aiRevenue)}`}
                          />
                          <div
                            className="bg-gray-300 rounded-sm min-w-[2px]"
                            style={{ width: `${(day.menuRevenue / maxRevenue) * 100}%`, transition: "width 0.3s" }}
                            title={`Меню: ${formatPrice(day.menuRevenue)}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-2 bg-blue-400 rounded-sm" /> AI
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-2 bg-gray-300 rounded-sm" /> Меню
                    </span>
                  </div>
                </div>
              )}

              {/* Top recommended dishes */}
              {data.topRecommended.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Топ рекомендованных блюд</h3>
                  <div className="space-y-2">
                    {data.topRecommended.map((dish, i) => (
                      <div key={dish.id} className="flex items-center gap-3 text-sm">
                        <span className="text-gray-400 w-6 text-right">{i + 1}.</span>
                        <span className="flex-1 text-gray-700 truncate">{dish.name}</span>
                        <span className="text-gray-400">
                          {dish.count} рек. / {dish.addedToCart} в корзине
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top not found queries */}
              {data.topNotFound.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Топ &quot;не найдено&quot; запросов</h3>
                  <div className="space-y-2">
                    {data.topNotFound.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className="text-gray-400 w-6 text-right">{i + 1}.</span>
                        <span className="flex-1 text-gray-700 truncate">&quot;{item.query}&quot;</span>
                        <span className="text-orange-500 font-medium">{item.count}x</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Запросы, по которым AI не нашёл подходящих блюд. Добавьте их в меню или улучшите описания.
                  </p>
                </div>
              )}

              {/* Empty state */}
              {data.summary.chatSessions === 0 && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">Пока нет данных за выбранный период</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: "blue" | "purple" | "green" | "gray";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
    green: "bg-green-50 text-green-700",
    gray: "bg-gray-50 text-gray-700",
  };
  const valueColors = {
    blue: "text-blue-600",
    purple: "text-purple-600",
    green: "text-green-600",
    gray: "text-gray-600",
  };

  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-xs opacity-70 mb-1">{label}</p>
      <p className={`text-xl font-bold ${valueColors[color]}`}>{value}</p>
      <p className="text-xs opacity-60 mt-1">{sub}</p>
    </div>
  );
}
