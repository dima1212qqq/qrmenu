"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface Category {
  id: string;
  menu_id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

interface Dish {
  id: string;
  menu_id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
}

interface DishCategory {
  dish_id: string;
  category_id: string;
}

interface MenuData {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  menu: {
    id: string;
    name: string;
    description: string | null;
    logo: string | null;
    settings: {
      soundEnabled: boolean;
    };
    categories: Category[];
    dishes: Dish[];
    dishCategories: DishCategory[];
  };
}

export default function MenuPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orgSlug = params.orgSlug as string;
  const menuId = params.menuId as string;
  const tableNumber = searchParams.get("table");

  const [data, setData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [calling, setCalling] = useState(false);
  const [called, setCalled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    async function fetchMenu() {
      try {
        const res = await fetch(`/api/public/menu/${orgSlug}/${menuId}`);
        if (!res.ok) {
          throw new Error("Menu not found");
        }
        const menuData = await res.json();
        setData(menuData);
        setSoundEnabled(menuData.menu.settings.soundEnabled ?? true);
      } catch (err) {
        setError("Меню не найдено");
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, [orgSlug, menuId]);

  const handleCallWaiter = useCallback(async () => {
    if (calling || called) return;
    setCalling(true);

    try {
      const res = await fetch(`/api/public/menu/${orgSlug}/${menuId}/waiter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber }),
      });

      if (res.ok) {
        setCalled(true);
        
        if (soundEnabled) {
          try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
          } catch (e) {
            console.error("Failed to play sound:", e);
          }
        }
      }
    } catch (err) {
      console.error("Failed to call waiter:", err);
    } finally {
      setCalling(false);
    }
  }, [orgSlug, menuId, tableNumber, calling, called, soundEnabled]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-500">Загрузка меню...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Ошибка</h2>
          <p className="text-gray-500">{error || "Меню не найдено"}</p>
        </div>
      </div>
    );
  }

  const { organization, menu } = data;

  const getDishCategories = (dishId: string): string[] => {
    return menu.dishCategories
      .filter((dc) => dc.dish_id === dishId)
      .map((dc) => dc.category_id);
  };

  const filteredDishes = activeCategory
    ? menu.dishes.filter((dish) => getDishCategories(dish.id).includes(activeCategory))
    : menu.dishes;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ru-RU").format(price);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">{menu.name}</h1>
              <p className="text-sm text-gray-500 truncate">{organization.name}</p>
            </div>
            <div className="flex items-center gap-2">
              {tableNumber && (
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  Стол {tableNumber}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {menu.categories.length > 0 && (
        <div className="bg-white border-b border-gray-200 sticky top-[73px] z-10">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  !activeCategory
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Все
              </button>
              {menu.categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeCategory === category.id
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 py-6">
        {menu.categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">В этом меню пока нет категорий</p>
          </div>
        ) : filteredDishes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">В этой категории пока нет блюд</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeCategory
              ? menu.categories
                  .filter((c) => c.id === activeCategory)
                  .map((category) => (
                    <div key={category.id}>
                      <h2 className="text-lg font-semibold text-gray-900 mb-3">
                        {category.name}
                      </h2>
                      <div className="space-y-3">
                        {filteredDishes.map((dish) => (
                          <div
                            key={dish.id}
                            className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4"
                          >
                            {dish.image && (
                              <img
                                src={dish.image}
                                alt={dish.name}
                                className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-medium text-gray-900">{dish.name}</h3>
                                <span className="text-primary font-semibold whitespace-nowrap">
                                  {formatPrice(dish.price)} ₽
                                </span>
                              </div>
                              {dish.description && (
                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                  {dish.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
              : menu.categories.map((category) => {
                  const categoryDishes = filteredDishes.filter((dish) =>
                    getDishCategories(dish.id).includes(category.id)
                  );
                  if (categoryDishes.length === 0) return null;

                  return (
                    <div key={category.id}>
                      <h2 className="text-lg font-semibold text-gray-900 mb-3">
                        {category.name}
                      </h2>
                      <div className="space-y-3">
                        {categoryDishes.map((dish) => (
                          <div
                            key={dish.id}
                            className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4"
                          >
                            {dish.image && (
                              <img
                                src={dish.image}
                                alt={dish.name}
                                className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-medium text-gray-900">{dish.name}</h3>
                                <span className="text-primary font-semibold whitespace-nowrap">
                                  {formatPrice(dish.price)} ₽
                                </span>
                              </div>
                              {dish.description && (
                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                  {dish.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-3xl mx-auto">
          <Button
            onClick={handleCallWaiter}
            disabled={calling || called}
            className="w-full"
            size="lg"
          >
            {called ? (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Официант вызван
              </span>
            ) : calling ? (
              "Вызов..."
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Вызвать официанта
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
