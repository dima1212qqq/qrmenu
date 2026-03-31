import { v4 as uuidv4 } from "uuid";
import { Menu, Category, Dish, DishCategory } from "./types";

export function generateId(): string {
  return uuidv4();
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function getDishesForCategory(dishes: Dish[], dishCategories: DishCategory[], categoryId: string): Dish[] {
  const dishIds = new Set(dishCategories.filter((dc) => dc.category_id === categoryId).map((dc) => dc.dish_id));
  return dishes.filter((dish) => dishIds.has(dish.id));
}

export function getDishesForMenu(dishes: Dish[], categories: Category[], dishCategories: DishCategory[], menuId: string): Dish[] {
  const categoryIds = new Set(categories.filter((c) => c.menu_id === menuId).map((c) => c.id));
  const dishIds = new Set(dishCategories.filter((dc) => categoryIds.has(dc.category_id)).map((dc) => dc.dish_id));
  return dishes.filter((dish) => dishIds.has(dish.id));
}

export function getCategoryIdsForDish(dishCategories: DishCategory[], dishId: string): string[] {
  return dishCategories.filter((dc) => dc.dish_id === dishId).map((dc) => dc.category_id);
}
