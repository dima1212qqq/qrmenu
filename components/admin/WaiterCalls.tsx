"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/Button";

interface WaiterCall {
  id: string;
  menu_id: string;
  table_number: string | null;
  created_at: number;
  status: string;
}

interface WaiterCallsProps {
  onClose: () => void;
}

export function WaiterCalls({ onClose }: WaiterCallsProps) {
  const [calls, setCalls] = useState<WaiterCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lastCallIdsRef = useRef<Set<string>>(new Set());
  const originalTitleRef = useRef<string>("");
  const titleFlashRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 1000;
        osc2.type = "sine";
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.3);
      }, 200);
    } catch (error) {
      console.error("Failed to play sound:", error);
    }
  }, [soundEnabled]);

  const startTitleFlash = useCallback(() => {
    if (titleFlashRef.current) return;
    
    originalTitleRef.current = document.title;
    let showAlert = true;
    
    titleFlashRef.current = setInterval(() => {
      document.title = showAlert ? "🔔 Вызов официанта!" : originalTitleRef.current;
      showAlert = !showAlert;
    }, 1000);
  }, []);

  const stopTitleFlash = useCallback(() => {
    if (titleFlashRef.current) {
      clearInterval(titleFlashRef.current);
      titleFlashRef.current = null;
      document.title = originalTitleRef.current;
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        stopTitleFlash();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopTitleFlash();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopTitleFlash]);

  const fetchCalls = useCallback(async () => {
    try {
      const res = await fetch("/api/waiter");
      if (res.ok) {
        const data = await res.json();
        setCalls(data);
        
        const pendingCalls = data.filter((c: WaiterCall) => c.status === "pending");
        const newCalls = pendingCalls.filter((c: WaiterCall) => !lastCallIdsRef.current.has(c.id));
        
        if (newCalls.length > 0) {
          playNotificationSound();
          
          if (document.visibilityState !== "visible") {
            startTitleFlash();
          }
          
          if (newCalls.length > 0 && notificationPermission === "granted") {
            newCalls.forEach((call: WaiterCall) => {
              new Notification("Вызов официанта!", {
                body: call.table_number ? `Стол: ${call.table_number}` : "Новый вызов",
                icon: "/favicon.ico",
                tag: "waiter-call",
              });
            });
          }
        }
        
        newCalls.forEach((c: WaiterCall) => lastCallIdsRef.current.add(c.id));
      }
    } catch (error) {
      console.error("Failed to fetch calls:", error);
    } finally {
      setLoading(false);
    }
  }, [notificationPermission, playNotificationSound, startTitleFlash]);

  useEffect(() => {
    fetchCalls();
    const interval = setInterval(fetchCalls, 5000);
    return () => clearInterval(interval);
  }, [fetchCalls]);

  const handleComplete = async (id: string) => {
    try {
      await fetch(`/api/waiter/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      fetchCalls();
    } catch (error) {
      console.error("Failed to complete call:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/waiter/${id}`, { method: "DELETE" });
      fetchCalls();
    } catch (error) {
      console.error("Failed to delete call:", error);
    }
  };

  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
    }
  };

  const pendingCalls = calls.filter((c) => c.status === "pending");
  const completedCalls = calls.filter((c) => c.status === "completed");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md h-full overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Вызовы официанта</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-3 py-2 sm:px-4 sm:py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-600">🔊 Звук</span>
          </label>
          <span className="text-xs text-gray-400">Обновляется каждые 5 сек</span>
        </div>

        {notificationPermission === "default" && (
          <div className="px-3 py-2 sm:px-4 sm:py-3 bg-blue-50 border-b border-blue-100">
            <p className="text-xs sm:text-sm text-blue-700 mb-2">Включите уведомления браузера для оповещений когда вкладка закрыта</p>
            <Button size="sm" onClick={requestNotificationPermission}>
              Разрешить
            </Button>
            <p className="text-xs text-blue-600 mt-2">
              ⚠️ На iOS: Настройки Safari → Уведомления
            </p>
          </div>
        )}

        {notificationPermission === "granted" && (
          <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-green-50 border-b border-green-100">
            <p className="text-xs sm:text-sm text-green-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Уведомления браузера включены
            </p>
          </div>
        )}

        {notificationPermission === "denied" && (
          <div className="px-3 py-2 sm:px-4 sm:py-3 bg-yellow-50 border-b border-yellow-100">
            <p className="text-xs sm:text-sm text-yellow-700 mb-1">Уведомления заблокированы</p>
            <p className="text-xs text-yellow-600">
              На iOS: Настройки Safari → Уведомления → Разрешить
            </p>
            <p className="text-xs text-yellow-600">
              На Android: Настройки сайта → Уведомления → Разрешить
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              {pendingCalls.length > 0 && (
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider mb-2 sm:mb-3">
                    Новые вызовы ({pendingCalls.length})
                  </h3>
                  <div className="space-y-2">
                    {pendingCalls.map((call) => (
                      <div
                        key={call.id}
                        className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-red-700 text-sm sm:text-base">
                              Вызов
                            </p>
                            {call.table_number && (
                              <p className="text-sm text-red-600">
                                Стол {call.table_number}
                              </p>
                            )}
                            <p className="text-xs text-red-400 mt-1">
                              {new Date(call.created_at).toLocaleTimeString("ru-RU")}
                            </p>
                          </div>
                          <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              onClick={() => handleComplete(call.id)}
                            >
                              ✓
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(call.id)}
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {completedCalls.length > 0 && (
                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider mb-2 sm:mb-3">
                    Принятые ({completedCalls.length})
                  </h3>
                  <div className="space-y-2">
                    {completedCalls.slice(0, 10).map((call) => (
                      <div
                        key={call.id}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 opacity-60"
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-gray-600 text-sm sm:text-base">
                              Вызов
                            </p>
                            {call.table_number && (
                              <p className="text-sm text-gray-500">
                                Стол {call.table_number}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(call.created_at).toLocaleTimeString("ru-RU")}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(call.id)}
                          >
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {calls.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">Нет вызовов</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
