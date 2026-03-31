export interface Menu {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  logo?: string | null;
  created_at: number;
  settings: MenuSettings;
}

export interface MenuSettings {
  telegramBotToken: string | null;
  telegramChatId: string | null;
  soundEnabled: boolean;
}

export interface Category {
  id: string;
  menu_id: string;
  name: string;
  description?: string | null;
  sort_order: number;
}

export interface Dish {
  id: string;
  menu_id: string;
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
}

export interface DishCategory {
  dish_id: string;
  category_id: string;
}

export interface WaiterCall {
  id: string;
  menu_id: string;
  table_number: string | null;
  created_at: number;
  status: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "owner" | "waiter";
  organization_id: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: number;
}

export interface AppState {
  menus: Menu[];
  dishes: Dish[];
  categories: Category[];
  dishCategories: DishCategory[];
  activeMenuId: string | null;
  activeCategoryId: string | null;
  loading: boolean;
  organization: Organization | null;
  users: User[];
}

export type Action =
  | { type: "SET_STATE"; payload: AppState }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ORGANIZATION"; payload: Organization }
  | { type: "SET_MENUS"; payload: Menu[] }
  | { type: "SET_DISHES"; payload: Dish[] }
  | { type: "SET_CATEGORIES"; payload: Category[] }
  | { type: "SET_DISH_CATEGORIES"; payload: DishCategory[] }
  | { type: "SET_FULL_MENU"; payload: Menu }
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
