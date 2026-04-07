"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface CartItem {
  dishId: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  updateQuantity: (dishId: string, quantity: number) => void;
  removeItem: (dishId: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ 
  children, 
  orgSlug 
}: { 
  children: ReactNode; 
  orgSlug: string;
}) {
  const storageKey = `cart-${orgSlug}`;
  
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
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

  const saveToStorage = useCallback((newItems: CartItem[]) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(newItems));
    }
  }, [storageKey]);

  const addItem = useCallback((item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.dishId === item.dishId);
      let newItems: CartItem[];
      if (existing) {
        newItems = prev.map((i) =>
          i.dishId === item.dishId
            ? { ...i, quantity: i.quantity + (item.quantity || 1) }
            : i
        );
      } else {
        newItems = [...prev, { ...item, quantity: item.quantity || 1 }];
      }
      saveToStorage(newItems);
      return newItems;
    });
  }, [saveToStorage]);

  const updateQuantity = useCallback((dishId: string, quantity: number) => {
    setItems((prev) => {
      const newItems = quantity <= 0
        ? prev.filter((i) => i.dishId !== dishId)
        : prev.map((i) => i.dishId === dishId ? { ...i, quantity } : i);
      saveToStorage(newItems);
      return newItems;
    });
  }, [saveToStorage]);

  const removeItem = useCallback((dishId: string) => {
    setItems((prev) => {
      const newItems = prev.filter((i) => i.dishId !== dishId);
      saveToStorage(newItems);
      return newItems;
    });
  }, [saveToStorage]);

  const clearCart = useCallback(() => {
    setItems([]);
    saveToStorage([]);
  }, [saveToStorage]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
