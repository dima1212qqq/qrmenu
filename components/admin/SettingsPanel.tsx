"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useStore } from "@/lib/store-api";

interface Settings {
  telegramBotToken: string | null;
  telegramChatId: string | null;
  soundEnabled: boolean;
  showWaiterButton: boolean;
  reviewRedirectUrl: string | null;
  reviewStarThreshold: number;
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { state } = useStore();
  const [settings, setSettings] = useState<Settings>({
    telegramBotToken: "",
    telegramChatId: "",
    soundEnabled: true,
    showWaiterButton: true,
    reviewRedirectUrl: "",
    reviewStarThreshold: 5,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchSettings();
    }
  }, [isOpen, state.activeOrganizationId]);

  const fetchSettings = async () => {
    if (!state.activeOrganizationId) return;
    try {
      const res = await fetch("/api/settings", {
        headers: { "x-organization-id": state.activeOrganizationId },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({
          telegramBotToken: data.telegramBotToken || "",
          telegramChatId: data.telegramChatId || "",
          soundEnabled: data.soundEnabled ?? true,
          showWaiterButton: data.showWaiterButton ?? true,
          reviewRedirectUrl: data.reviewRedirectUrl || "",
          reviewStarThreshold: data.reviewStarThreshold ?? 5,
        });
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!state.activeOrganizationId) return;
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": state.activeOrganizationId,
        },
        body: JSON.stringify({
          telegramBotToken: settings.telegramBotToken || null,
          telegramChatId: settings.telegramChatId || null,
          soundEnabled: settings.soundEnabled,
          showWaiterButton: settings.showWaiterButton,
          reviewRedirectUrl: settings.reviewRedirectUrl || null,
          reviewStarThreshold: settings.reviewStarThreshold,
        }),
      });
      onClose();
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!settings.telegramBotToken || !settings.telegramChatId || !state.activeOrganizationId) {
      setTestMessage("Сначала заполните токен и chat ID");
      return;
    }

    setTesting(true);
    setTestMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": state.activeOrganizationId,
        },
        body: JSON.stringify({
          message: "🔔 Тестовое сообщение!\n\nЕсли вы видите это, значит Telegram уведомления настроены правильно.",
        }),
      });

      if (res.ok) {
        setTestMessage("✅ Сообщение отправлено!");
      } else {
        setTestMessage("❌ Ошибка отправки");
      }
    } catch (error) {
      setTestMessage("❌ Ошибка: " + error);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Настройки уведомлений"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">📱 Кнопка вызова официанта</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showWaiterButton}
                onChange={(e) => setSettings({ ...settings, showWaiterButton: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-600">Показывать кнопку &quot;Вызвать официанта&quot;</span>
            </label>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">🔊 Звуковые уведомления</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => setSettings({ ...settings, soundEnabled: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-600">Воспроизводить звук при новом вызове</span>
            </label>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">⭐ Сбор отзывов</h3>
            <p className="text-xs text-gray-500 mb-4">
              Настройте QR-код для сбора отзывов. При оценке ниже порога, отзыв будет отправлен в Telegram.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ссылка для редиректа (при высокой оценке)
                </label>
                <Input
                  placeholder="https://yandex.ru/maps/..."
                  value={settings.reviewRedirectUrl || ""}
                  onChange={(e) => setSettings({ ...settings, reviewRedirectUrl: e.target.value })}
                />
                <p className="text-xs text-gray-400 mt-1">
                  2GIS, Яндекс.Карты и т.д.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Порог перенаправления (звезд)
                </label>
                <div className="flex gap-2">
                  {[4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSettings({ ...settings, reviewStarThreshold: num })}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        settings.reviewStarThreshold === num
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {num} ★
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  При оценке {settings.reviewStarThreshold} ★ и выше - редирект, ниже - отзыв в Telegram
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">📱 Telegram уведомления</h3>
            <p className="text-xs text-gray-500 mb-4">
              Настройте Telegram Bot для получения уведомлений о вызовах официанта на любом устройстве.
              Эти настройки будут использоваться по умолчанию для всех меню.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bot Token</label>
                <Input
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  value={settings.telegramBotToken || ""}
                  onChange={(e) => setSettings({ ...settings, telegramBotToken: e.target.value })}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Получите токен от @BotFather в Telegram
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Chat ID</label>
                <Input
                  placeholder="123456789"
                  value={settings.telegramChatId || ""}
                  onChange={(e) => setSettings({ ...settings, telegramChatId: e.target.value })}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Узнать Chat ID: напишите боту @userinfobot или @getidsbot
                </p>
              </div>

              <Button
                variant="secondary"
                onClick={handleTest}
                disabled={testing || !settings.telegramBotToken || !settings.telegramChatId}
              >
                {testing ? "Отправка..." : "Отправить тестовое сообщение"}
              </Button>

              {testMessage && (
                <p className={`text-sm ${testMessage.includes("✅") ? "text-green-600" : "text-red-600"}`}>
                  {testMessage}
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-xs font-medium text-gray-600 mb-2">Как настроить Telegram:</h4>
            <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
              <li>Откройте Telegram и найдите @BotFather</li>
              <li>Отправьте команду /newbot</li>
              <li>Следуйте инструкциям и получите токен</li>
              <li>Найдите @userinfobot и отправьте любое сообщение</li>
              <li>Скопируйте полученный Chat ID в поля выше</li>
            </ol>
          </div>
        </div>
      )}
    </Modal>
  );
}
