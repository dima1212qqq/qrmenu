"use client";

import { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from "react";
import { Menu, Category, Dish, DishCategory, User, Organization, AppState } from "./types";

const initialState: AppState = {
  menus: [],
  dishes: [],
  categories: [],
  dishCategories: [],
  activeMenuId: null,
  activeCategoryId: null,
  loading: true,
  organization: null,
  users: [],
};

type Action =
  | { type: "SET_STATE"; payload: AppState }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ORGANIZATION"; payload: Organization }
  | { type: "SET_MENUS"; payload: Menu[] }
  | { type: "SET_DISHES"; payload: Dish[] }
  | { type: "SET_CATEGORIES"; payload: Category[] }
  | { type: "SET_DISH_CATEGORIES"; payload: DishCategory[] }
  | { type: "SET_FULL_MENU"; payload: { menu: Menu; categories: Category[]; dishes: Dish[]; dishCategories: DishCategory[] } }
  | { type: "CREATE_MENU"; payload: Menu }
  | { type: "UPDATE_MENU"; payload: Menu }
  | { type: "DELETE_MENU"; payload: string }
  | { type: "SET_ACTIVE_MENU"; payload: string | null }
  | { type: "CREATE_CATEGORY"; payload: Category }
  | { type: "UPDATE_CATEGORY"; payload: Category }
  | { type: "DELETE_CATEGORY"; payload: { menuId: string; categoryId: string } }
  | { type: "SET_ACTIVE_CATEGORY"; payload: string | null }
  | { type: "REORDER_CATEGORIES"; payload: Category[] }
  | { type: "CREATE_DISH"; payload: Dish }
  | { type: "UPDATE_DISH"; payload: Dish }
  | { type: "DELETE_DISH"; payload: { menuId: string; dishId: string } }
  | { type: "ADD_DISH_TO_CATEGORY"; payload: { dishId: string; categoryId: string } }
  | { type: "REMOVE_DISH_FROM_CATEGORY"; payload: { dishId: string; categoryId: string } }
  | { type: "SET_USERS"; payload: User[] }
  | { type: "ADD_USER"; payload: User }
  | { type: "DELETE_USER"; payload: string };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_STATE":
      return action.payload;

    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "SET_ORGANIZATION":
      return { ...state, organization: action.payload };

    case "SET_MENUS":
      return { ...state, menus: action.payload };

    case "SET_DISHES":
      return { ...state, dishes: action.payload };

    case "SET_CATEGORIES":
      return { ...state, categories: action.payload };

    case "SET_DISH_CATEGORIES":
      return { ...state, dishCategories: action.payload };

    case "SET_FULL_MENU": {
      const { menu, categories, dishes, dishCategories } = action.payload;
      const existingIndex = state.menus.findIndex((m) => m.id === menu.id);
      const newMenus = existingIndex >= 0
        ? state.menus.map((m) => (m.id === menu.id ? menu : m))
        : [...state.menus, menu];
      
      return {
        ...state,
        menus: newMenus,
        dishes: [...state.dishes.filter((d) => d.menu_id !== menu.id), ...dishes],
        categories: [...state.categories.filter((c) => c.menu_id !== menu.id), ...categories],
        dishCategories: [...state.dishCategories.filter((dc) => !dishes.some((d) => d.id === dc.dish_id)), ...dishCategories],
        activeMenuId: menu.id,
      };
    }

    case "CREATE_MENU":
      return { ...state, menus: [...state.menus, action.payload] };

    case "UPDATE_MENU":
      return {
        ...state,
        menus: state.menus.map((m) => (m.id === action.payload.id ? action.payload : m)),
      };

    case "DELETE_MENU":
      return {
        ...state,
        menus: state.menus.filter((m) => m.id !== action.payload),
        dishes: state.dishes.filter((d) => d.menu_id !== action.payload),
        categories: state.categories.filter((c) => c.menu_id !== action.payload),
        dishCategories: state.dishCategories.filter((dc) => !state.dishes.some((d) => d.menu_id === action.payload && d.id === dc.dish_id)),
        activeMenuId: state.activeMenuId === action.payload ? null : state.activeMenuId,
      };

    case "SET_ACTIVE_MENU":
      return { ...state, activeMenuId: action.payload, activeCategoryId: null };

    case "CREATE_CATEGORY":
      return { ...state, categories: [...state.categories, action.payload] };

    case "UPDATE_CATEGORY":
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      };

    case "DELETE_CATEGORY":
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.payload.categoryId),
        dishCategories: state.dishCategories.filter((dc) => dc.category_id !== action.payload.categoryId),
        activeCategoryId: state.activeCategoryId === action.payload.categoryId ? null : state.activeCategoryId,
      };

    case "SET_ACTIVE_CATEGORY":
      return { ...state, activeCategoryId: action.payload };

    case "REORDER_CATEGORIES":
      return { ...state, categories: action.payload };

    case "CREATE_DISH":
      return { ...state, dishes: [...state.dishes, action.payload] };

    case "UPDATE_DISH":
      return {
        ...state,
        dishes: state.dishes.map((d) => (d.id === action.payload.id ? action.payload : d)),
      };

    case "DELETE_DISH":
      return {
        ...state,
        dishes: state.dishes.filter((d) => d.id !== action.payload.dishId),
        dishCategories: state.dishCategories.filter((dc) => dc.dish_id !== action.payload.dishId),
      };

    case "ADD_DISH_TO_CATEGORY":
      return {
        ...state,
        dishCategories: [...state.dishCategories, { dish_id: action.payload.dishId, category_id: action.payload.categoryId }],
      };

    case "REMOVE_DISH_FROM_CATEGORY":
      return {
        ...state,
        dishCategories: state.dishCategories.filter(
          (dc) => !(dc.dish_id === action.payload.dishId && dc.category_id === action.payload.categoryId)
        ),
      };

    case "SET_USERS":
      return { ...state, users: action.payload };

    case "ADD_USER":
      return { ...state, users: [...state.users, action.payload] };

    case "DELETE_USER":
      return { ...state, users: state.users.filter((u) => u.id !== action.payload) };

    default:
      return state;
  }
}

interface StoreContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  refreshData: () => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const refreshData = useCallback(async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const [orgRes, menusRes, categoriesRes, dishesRes, dishCatsRes] = await Promise.all([
        fetch("/api/organizations/me"),
        fetch("/api/menus"),
        fetch("/api/categories"),
        fetch("/api/dishes"),
        fetch("/api/dish-categories"),
      ]);

      if (orgRes.ok) {
        const org = await orgRes.json();
        dispatch({ type: "SET_ORGANIZATION", payload: org });
      }

      if (menusRes.ok) {
        const menus = await menusRes.json();
        dispatch({ type: "SET_MENUS", payload: menus });
      }

      if (categoriesRes.ok) {
        const categories = await categoriesRes.json();
        dispatch({ type: "SET_CATEGORIES", payload: categories });
      }

      if (dishesRes.ok) {
        const dishes = await dishesRes.json();
        dispatch({ type: "SET_DISHES", payload: dishes });
      }

      if (dishCatsRes.ok) {
        const dishCategories = await dishCatsRes.json();
        dispatch({ type: "SET_DISH_CATEGORIES", payload: dishCategories });
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const users = await res.json();
        dispatch({ type: "SET_USERS", payload: users });
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <StoreContext.Provider value={{ state, dispatch, refreshData, refreshUsers }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}

export function useActiveMenu(): Menu | null {
  const { state } = useStore();
  return state.menus.find((m) => m.id === state.activeMenuId) || null;
}

export function useActiveCategory(): Category | null {
  const { state } = useStore();
  return state.categories.find((c) => c.id === state.activeCategoryId) || null;
}

export function useCategoriesForMenu(menuId: string | null): Category[] {
  const { state } = useStore();
  if (!menuId) return [];
  return state.categories
    .filter((c) => c.menu_id === menuId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function useDishesForMenu(menuId: string | null): Dish[] {
  const { state } = useStore();
  if (!menuId) return [];
  return state.dishes.filter((d) => d.menu_id === menuId);
}

export function useDishCategoriesForDish(dishId: string): string[] {
  const { state } = useStore();
  return state.dishCategories
    .filter((dc) => dc.dish_id === dishId)
    .map((dc) => dc.category_id);
}

export function useCategoriesForDish(dishId: string): Category[] {
  const { state } = useStore();
  const categoryIds = state.dishCategories
    .filter((dc) => dc.dish_id === dishId)
    .map((dc) => dc.category_id);
  return state.categories.filter((c) => categoryIds.includes(c.id));
}

export type { Menu, Category, Dish, User, Organization, DishCategory };
