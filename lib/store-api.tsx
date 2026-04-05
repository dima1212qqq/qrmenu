"use client";

import { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from "react";
import { Menu, Category, Dish, DishCategory, User, Organization, Tag, AppState, UserOrganization } from "./types";

const ACTIVE_ORG_STORAGE_KEY = "menu-qr-active-organization";

const initialState: AppState = {
  menus: [],
  dishes: [],
  categories: [],
  dishCategories: [],
  tags: [],
  activeMenuId: null,
  activeCategoryId: null,
  loading: true,
  organization: null,
  organizations: [],
  userOrganizations: [],
  activeOrganizationId: null,
  users: [],
};

type Action =
  | { type: "SET_STATE"; payload: AppState }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ORGANIZATION"; payload: Organization }
  | { type: "SET_ORGANIZATIONS"; payload: Organization[] }
  | { type: "SET_USER_ORGANIZATIONS"; payload: UserOrganization[] }
  | { type: "SET_ACTIVE_ORGANIZATION"; payload: string | null }
  | { type: "SET_MENUS"; payload: Menu[] }
  | { type: "SET_DISHES"; payload: Dish[] }
  | { type: "SET_CATEGORIES"; payload: Category[] }
  | { type: "SET_DISH_CATEGORIES"; payload: DishCategory[] }
  | { type: "SET_TAGS"; payload: Tag[] }
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
  | { type: "DELETE_USER"; payload: string }
  | { type: "CREATE_TAG"; payload: Tag }
  | { type: "UPDATE_TAG"; payload: Tag }
  | { type: "DELETE_TAG"; payload: string };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_STATE":
      return action.payload;

    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "SET_ORGANIZATION":
      return { ...state, organization: action.payload };

    case "SET_ORGANIZATIONS":
      return { ...state, organizations: action.payload };

    case "SET_USER_ORGANIZATIONS":
      return { ...state, userOrganizations: action.payload };

    case "SET_ACTIVE_ORGANIZATION":
      return { ...state, activeOrganizationId: action.payload };

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

    case "SET_TAGS":
      return { ...state, tags: action.payload };

    case "CREATE_TAG":
      return { ...state, tags: [...state.tags, action.payload] };

    case "UPDATE_TAG":
      return {
        ...state,
        tags: state.tags.map((t) => (t.id === action.payload.id ? action.payload : t)),
      };

    case "DELETE_TAG":
      return { ...state, tags: state.tags.filter((t) => t.id !== action.payload) };

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

  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = {};
    if (state.activeOrganizationId) {
      headers["x-organization-id"] = state.activeOrganizationId;
    }
    return headers;
  }, [state.activeOrganizationId]);

  const refreshData = useCallback(async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_MENUS", payload: [] });
      dispatch({ type: "SET_DISHES", payload: [] });
      dispatch({ type: "SET_CATEGORIES", payload: [] });
      dispatch({ type: "SET_DISH_CATEGORIES", payload: [] });
      dispatch({ type: "SET_TAGS", payload: [] });
      dispatch({ type: "SET_USERS", payload: [] });
      dispatch({ type: "SET_ACTIVE_MENU", payload: null });

      const orgRes = await fetch("/api/organizations/me");

      if (orgRes.ok) {
        const userOrgs = await orgRes.json();
        const organizations = userOrgs.map((uo: any) => uo.organization);
        const userOrganizations = userOrgs.map((uo: any) => ({
          id: uo.organization.id,
          user_id: "",
          organization_id: uo.organization.id,
          role: uo.role,
        }));
        
        dispatch({ type: "SET_ORGANIZATIONS", payload: organizations });
        dispatch({ type: "SET_USER_ORGANIZATIONS", payload: userOrganizations });

        const savedActiveOrgId =
          typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_ORG_STORAGE_KEY) : null;
        const preferredOrgId = state.activeOrganizationId || savedActiveOrgId;
        const newActiveOrgId =
          preferredOrgId && organizations.some((organization: Organization) => organization.id === preferredOrgId)
            ? preferredOrgId
            : organizations.length > 0
              ? organizations[0].id
              : null;

        dispatch({ type: "SET_ACTIVE_ORGANIZATION", payload: newActiveOrgId });

        const activeOrganization = organizations.find((organization: Organization) => organization.id === newActiveOrgId);
        if (activeOrganization) {
          dispatch({ type: "SET_ORGANIZATION", payload: activeOrganization });
        }
        
        if (newActiveOrgId) {
          const headers = { "x-organization-id": newActiveOrgId };

          const [menusRes, categoriesRes, dishesRes, dishCatsRes, tagsRes] = await Promise.all([
            fetch(`/api/menus?orgId=${newActiveOrgId}`, { headers }),
            fetch(`/api/categories?orgId=${newActiveOrgId}`, { headers }),
            fetch(`/api/dishes?orgId=${newActiveOrgId}`, { headers }),
            fetch("/api/dish-categories", { headers }),
            fetch("/api/tags", { headers }),
          ]);

          const menus = menusRes.ok ? await menusRes.json() : [];
          const categories = categoriesRes.ok ? await categoriesRes.json() : [];
          const dishes = dishesRes.ok ? await dishesRes.json() : [];
          const dishCategories = dishCatsRes.ok ? await dishCatsRes.json() : [];
          const tags = tagsRes.ok ? await tagsRes.json() : [];

          dispatch({ type: "SET_CATEGORIES", payload: categories });
          dispatch({ type: "SET_DISHES", payload: dishes });
          dispatch({ type: "SET_DISH_CATEGORIES", payload: dishCategories });
          dispatch({ type: "SET_TAGS", payload: tags });
          dispatch({ type: "SET_MENUS", payload: menus });

          const nextActiveMenuId = menus.length > 0 ? menus[0].id : null;
          dispatch({ type: "SET_ACTIVE_MENU", payload: nextActiveMenuId });
        }
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [state.activeOrganizationId]);

  const refreshUsers = useCallback(async () => {
    if (!state.activeOrganizationId) {
      dispatch({ type: "SET_USERS", payload: [] });
      return;
    }

    try {
      const headers = getHeaders();
      const res = await fetch("/api/users", { headers });
      if (res.ok) {
        const users = await res.json();
        dispatch({ type: "SET_USERS", payload: users });
      } else {
        dispatch({ type: "SET_USERS", payload: [] });
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      dispatch({ type: "SET_USERS", payload: [] });
    }
  }, [getHeaders, state.activeOrganizationId]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (state.activeOrganizationId) {
      window.localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, state.activeOrganizationId);
    } else {
      window.localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
    }
  }, [state.activeOrganizationId]);

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

export type { Menu, Category, Dish, User, Organization, DishCategory, Tag };
