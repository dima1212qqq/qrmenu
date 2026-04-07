"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AIChatButton } from "@/components/ui/AIChatButton";
import { AIChatWidget } from "@/components/ui/AIChatWidget";
import { Cart } from "@/components/ui/Cart";
import { CartProvider, useCart } from "@/components/ui/CartContext";

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
  weight: string | null;
  calories: number | null;
  allergens: string | null;
  tag_id: string | null;
  is_available?: boolean;
}

interface Tag {
  id: string;
  name: string;
  emoji: string;
}

interface DishCategory {
  dish_id: string;
  category_id: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  categories: Category[];
  dishes: Dish[];
  dishCategories: DishCategory[];
}

interface OrgMenuData {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  menus: MenuItem[];
  tags: Tag[];
  settings: {
    showWaiterButton?: boolean;
  };
}

export default function OrgMenuPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orgSlug = params.orgSlug as string;
  const tableNumber = searchParams.get("table");
  const isSharedLink = searchParams.get("share") === "true";
  const initialMenuId = searchParams.get("menu");

  const [data, setData] = useState<OrgMenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [calling, setCalling] = useState(false);
  const [called, setCalled] = useState(false);
  const [showWaiterButton, setShowWaiterButton] = useState(false);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const { items: cart, addItem, updateQuantity, removeItem, totalItems: cartItemCount, totalPrice: cartTotal } = useCart();

  useEffect(() => {
    async function fetchMenu() {
      try {
        const res = await fetch(`/api/public/org/${orgSlug}`);
        if (!res.ok) {
          throw new Error("Menu not found");
        }
        const menuData = await res.json();
        setData(menuData);
        setShowWaiterButton(isSharedLink ? false : (menuData.settings.showWaiterButton ?? true));
        
        if (initialMenuId) {
          setActiveMenuId(initialMenuId);
        } else if (menuData.menus.length > 0) {
          setActiveMenuId(menuData.menus[0].id);
        }
      } catch (err) {
        setError("Меню не найдено");
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, [orgSlug, isSharedLink, initialMenuId]);

  const activeMenu = data?.menus.find((m) => m.id === activeMenuId);

  const getDishCategories = (dishId: string): string[] => {
    if (!activeMenu) return [];
    return activeMenu.dishCategories
      .filter((dc) => dc.dish_id === dishId)
      .map((dc) => dc.category_id);
  };

  const getDishTag = (tagId: string | null): Tag | undefined => {
    if (!tagId) return undefined;
    return data?.tags.find((t) => t.id === tagId);
  };

  const filteredDishes = activeCategory
    ? activeMenu?.dishes.filter((dish) =>
        getDishCategories(dish.id).includes(activeCategory)
      ) || []
    : activeMenu?.dishes || [];

  const handleCallWaiter = useCallback(async () => {
    if (calling || called || !activeMenuId) return;
    setCalling(true);

    try {
      const res = await fetch(`/api/public/menu/${orgSlug}/${activeMenuId}/waiter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber }),
      });

      if (res.ok) {
        setCalled(true);
      }
    } catch (err) {
      console.error("Failed to call waiter:", err);
    } finally {
      setCalling(false);
    }
  }, [orgSlug, activeMenuId, tableNumber, calling, called]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ru-RU").format(price);
  };

  const handleSubmitOrder = async () => {
    if (!activeMenuId || cart.length === 0 || isSubmittingOrder) return;

    setIsSubmittingOrder(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuId: activeMenuId,
          tableNumber,
          items: cart,
        }),
      });

      if (!res.ok) throw new Error("Order submission failed");

      const data = await res.json();
      alert(`Заказ #${data.orderId} отправлен! Итого: ${formatPrice(data.total)} ₽`);
      setShowCart(false);
    } catch (error) {
      alert("Не удалось отправить заказ. Попробуйте ещё раз.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Ошибка</h1>
          <p className="text-gray-500">{error || "Меню не найдено"}</p>
        </div>
      </div>
    );
  }

  return (
    <CartProvider orgSlug={orgSlug}>
      <div className="min-h-screen bg-background">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-gray-900 truncate">
                {data.organization.name}
              </h1>
              {tableNumber && (
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  Стол {tableNumber}
                </span>
            )}
          </div>

          {data.menus.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {data.menus.map((menu) => (
                <button
                  key={menu.id}
                  onClick={() => {
                    setActiveMenuId(menu.id);
                    setActiveCategory(null);
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeMenuId === menu.id
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {menu.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 pb-24">
        {activeMenu?.categories && activeMenu.categories.length > 0 && (
          <div className="mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
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
              {activeMenu.categories
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((category) => (
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
        )}

        {!activeCategory && activeMenu?.categories && activeMenu.categories.length > 0 ? (
          activeMenu.categories
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((category) => {
              const categoryDishes = filteredDishes.filter((dish) =>
                getDishCategories(dish.id).includes(category.id)
              );
              if (categoryDishes.length === 0) return null;

              return (
                <div key={category.id} className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    {category.name}
                  </h2>
                  <div className="space-y-3">
                    {categoryDishes.map((dish) => {
                      const tag = getDishTag(dish.tag_id);
                      const cartItem = cart.find((item) => item.dishId === dish.id);
                      return (
                        <div
                          key={dish.id}
                          className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4 cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => setSelectedDish(dish)}
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
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-gray-900">{dish.name}</h3>
                                {tag && (
                                  <span className="text-lg" title={tag.name}>{tag.emoji}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-primary font-semibold whitespace-nowrap">
                                  {formatPrice(dish.price)} ₽
                                </span>
                                {!isSharedLink && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addItem({ dishId: dish.id, name: dish.name, price: dish.price });
                                    }}
                                    className="w-8 h-8 bg-primary hover:bg-primary-light rounded-full flex items-center justify-center text-white transition-colors flex-shrink-0"
                                  >
                                    {cartItem ? cartItem.quantity : "+"}
                                  </button>
                                )}
                              </div>
                            </div>
                            {dish.description && (
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                {dish.description}
                              </p>
                            )}
                            {(dish.weight || dish.calories) && (
                              <p className="text-xs text-gray-400 mt-1">
                                {dish.weight && `${dish.weight}`}
                                {dish.weight && dish.calories && " • "}
                                {dish.calories && `${dish.calories} ккал`}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
        ) : (
          <div className="space-y-3">
            {filteredDishes.map((dish) => {
              const tag = getDishTag(dish.tag_id);
              const cartItem = cart.find((item) => item.dishId === dish.id);
              return (
                <div
                  key={dish.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedDish(dish)}
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
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{dish.name}</h3>
                        {tag && (
                          <span className="text-lg" title={tag.name}>{tag.emoji}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-semibold whitespace-nowrap">
                          {formatPrice(dish.price)} ₽
                        </span>
                        {!isSharedLink && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addItem({ dishId: dish.id, name: dish.name, price: dish.price });
                            }}
                            className="w-8 h-8 bg-primary hover:bg-primary-light rounded-full flex items-center justify-center text-white transition-colors flex-shrink-0"
                          >
                            {cartItem ? cartItem.quantity : "+"}
                          </button>
                        )}
                      </div>
                    </div>
                    {dish.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {dish.description}
                      </p>
                    )}
                    {(dish.weight || dish.calories) && (
                      <p className="text-xs text-gray-400 mt-1">
                        {dish.weight && `${dish.weight}`}
                        {dish.weight && dish.calories && " • "}
                        {dish.calories && `${dish.calories} ккал`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {selectedDish && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedDish(null)}
          />
          <div className="relative bg-white w-full max-w-lg sm:max-w-2xl max-h-[85vh] overflow-hidden rounded-t-2xl sm:rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {selectedDish.image && (
              <div className="relative h-48 sm:h-64">
                <img
                  src={selectedDish.image}
                  alt={selectedDish.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedDish(null)}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(85vh-12rem)]">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{selectedDish.name}</h2>
                    {getDishTag(selectedDish.tag_id) && (
                      <span className="text-2xl">{getDishTag(selectedDish.tag_id)!.emoji}</span>
                    )}
                  </div>
                  {(selectedDish.weight || selectedDish.calories) && (
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedDish.weight && `${selectedDish.weight}`}
                      {selectedDish.weight && selectedDish.calories && " • "}
                      {selectedDish.calories && `${selectedDish.calories} ккал`}
                    </p>
                  )}
                </div>
                <p className="text-xl sm:text-2xl font-bold text-primary">
                  {formatPrice(selectedDish.price)} ₽
                </p>
              </div>
              
              {selectedDish.description && (
                <p className="text-gray-600 mb-4 whitespace-pre-wrap">{selectedDish.description}</p>
              )}
              
              {selectedDish.allergens && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <p className="text-sm font-medium text-amber-800">
                    ⚠️ Аллергены: {selectedDish.allergens}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        <div className="max-w-3xl mx-auto flex gap-3">
          {!isSharedLink && cartItemCount > 0 && (
            <Button
              onClick={() => setShowCart(true)}
              variant="secondary"
              className="flex-1"
              size="lg"
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Корзина ({cartItemCount})
              </span>
            </Button>
          )}
          {showWaiterButton && (
            <Button
              onClick={handleCallWaiter}
              disabled={calling || called}
              className="flex-1"
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
                  Вызвать
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      <AIChatButton onClick={() => setShowAIChat(true)} cartCount={cartItemCount} />
      {showAIChat && activeMenuId && (
        <AIChatWidget
          menuId={activeMenuId}
          organizationSlug={orgSlug}
          tableNumber={tableNumber}
          isShared={isSharedLink}
          onClose={() => setShowAIChat(false)}
          onOrderSubmit={(orderId, total) => {
            console.log(`Order ${orderId} submitted: ${total}₽`);
          }}
        />
      )}
      {showCart && (
        <Cart
          items={cart}
          onUpdateQuantity={updateQuantity}
          onRemove={removeItem}
          onSubmit={handleSubmitOrder}
          onClose={() => setShowCart(false)}
          isSubmitting={isSubmittingOrder}
        />
      )}
    </div>
    </CartProvider>
  );
}
