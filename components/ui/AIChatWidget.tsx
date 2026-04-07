"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "./Button";
import { useCart } from "./CartContext";

interface Dish {
  id: string;
  name: string;
  price: number;
  image: string | null;
  description?: string | null;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  dishes?: Dish[];
}

interface AIChatWidgetProps {
  organizationSlug: string;
  menuId?: string;
  tableNumber?: string | null;
  isShared?: boolean;
  onClose: () => void;
  onOrderSubmit?: (orderId: string, total: number) => void;
}

export function AIChatWidget({
  organizationSlug,
  menuId,
  tableNumber,
  isShared = false,
  onClose,
  onOrderSubmit,
}: AIChatWidgetProps) {
  const storageKey = `ai-chat-${organizationSlug}`;
  const { items: cart, addItem, updateQuantity, removeItem, totalItems, totalPrice: cartTotal, clearCart } = useCart();
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    inputRef.current?.focus();
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "Привет! Я AI-ассистент этого ресторана. Расскажите, что вам нравится? Могу помочь найти блюдо по вашим предпочтениям 🍽️",
        },
      ]);
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai/chat-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgSlug: organizationSlug,
          messages: [...conversationHistory, { role: "user", content: userMessage.content }],
        }),
      });

      if (!res.ok) throw new Error("Chat request failed");

      const data = await res.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        dishes: data.relevantDishes || [],
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Произошла небольшая ошибка. Попробуйте ещё раз или выберите блюдо вручную из меню.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addToCart = (dish: Dish) => {
    addItem({ dishId: dish.id, name: dish.name, price: dish.price });
  };

  const removeFromCart = (dishId: string) => {
    removeItem(dishId);
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/ai/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuId,
          tableNumber,
          items: cart,
        }),
      });

      if (!res.ok) throw new Error("Order submission failed");

      const data = await res.json();

      const confirmationMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Заказ #${data.orderId} отправлен! Итого: ${new Intl.NumberFormat("ru-RU").format(data.total)} ₽. Ожидайте, скоро свяжемся с вами!`,
      };
      setMessages((prev) => [...prev, confirmationMessage]);
      clearCart();
      setShowCart(false);
      onOrderSubmit?.(data.orderId, data.total);
    } catch (error) {
      alert("Не удалось отправить заказ. Попробуйте ещё раз.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ru-RU").format(price);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white w-full sm:w-[420px] sm:max-h-[80vh] h-full sm:h-[80vh] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Помощник</h3>
              <p className="text-xs text-gray-500">Всегда на связи</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isShared && (
              <button
                onClick={() => setShowCart(!showCart)}
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {showCart ? (
          <div className="flex-1 overflow-y-auto p-4">
            <h4 className="font-semibold text-gray-900 mb-4">Ваш заказ</h4>
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Корзина пуста</p>
            ) : (
              <>
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.dishId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatPrice(item.price)} ₽ × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeFromCart(item.dishId)}
                          className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-700 transition-colors"
                        >
                          −
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() =>
                            addToCart({ id: item.dishId, name: item.name, price: item.price, image: null })
                          }
                          className="w-8 h-8 bg-primary hover:bg-primary-light rounded-full flex items-center justify-center text-white transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold text-gray-900">Итого:</span>
                    <span className="font-bold text-xl text-primary">
                      {formatPrice(cartTotal)} ₽
                    </span>
                  </div>
                  <Button
                    onClick={handleSubmitOrder}
                    loading={isSubmitting}
                    className="w-full"
                    size="lg"
                  >
                    Отправить заказ
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-primary text-white rounded-br-4px"
                        : "bg-gray-100 text-gray-900 rounded-bl-4px"
                    }`}
                    style={{
                      borderBottomRightRadius: message.role === "user" ? "4px" : "16px",
                      borderBottomLeftRadius: message.role === "assistant" ? "4px" : "16px",
                    }}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>

                    {message.dishes && message.dishes.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.dishes.map((dish) => (
                          <div
                            key={dish.id}
                            className="flex items-center gap-3 p-2 bg-white rounded-lg"
                          >
                            {dish.image && (
                              <img
                                src={dish.image}
                                alt={dish.name}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{dish.name}</p>
                              <p className="text-sm text-primary font-semibold">
                                {formatPrice(dish.price)} ₽
                              </p>
                            </div>
                            {!isShared && (
                              <button
                                onClick={() => addToCart(dish)}
                                className="px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-full hover:bg-primary-light transition-colors"
                              >
                                +
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-4px px-4 py-3">
                    <div className="flex items-center gap-2 text-gray-500">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-sm">Думаю...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Напишите, что вам нравится..."
                  className="flex-1 resize-none rounded-full border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={1}
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
