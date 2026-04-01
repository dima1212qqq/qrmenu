"use client";

import React, { useState } from "react";
import { useStore, useActiveMenu, useCategoriesForMenu, useDishesForMenu } from "@/lib/store-api";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { CategoryCard } from "./CategoryCard";
import { DishCard } from "./DishCard";
import { TagsPanel } from "./TagsPanel";

export function MenuEditor() {
  const { state, dispatch } = useStore();
  const menu = useActiveMenu();
  const categories = useCategoriesForMenu(menu?.id || null);
  const menuDishes = useDishesForMenu(menu?.id || null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddDish, setShowAddDish] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newDishName, setNewDishName] = useState("");
  const [newDishDesc, setNewDishDesc] = useState("");
  const [newDishPrice, setNewDishPrice] = useState("");
  const [newDishImage, setNewDishImage] = useState("");
  const [newDishWeight, setNewDishWeight] = useState("");
  const [newDishCalories, setNewDishCalories] = useState("");
  const [newDishAllergens, setNewDishAllergens] = useState("");
  const [newDishTagId, setNewDishTagId] = useState("");
  const [newDishCategoryIds, setNewDishCategoryIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"categories" | "dishes" | "tags">("categories");
  const [addingCategory, setAddingCategory] = useState(false);
  const [addingDish, setAddingDish] = useState(false);

  if (!menu) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Выберите меню</h2>
          <p className="text-gray-500">Создайте новое меню или выберите существующее слева</p>
        </div>
      </div>
    );
  }

  const sortedCategories = [...categories].sort((a, b) => a.sort_order - b.sort_order);

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setAddingCategory(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuId: menu.id,
          name: newCatName.trim(),
          description: newCatDesc.trim() || undefined,
        }),
      });
      if (res.ok) {
        const category = await res.json();
        dispatch({
          type: "CREATE_CATEGORY",
          payload: {
            id: category.id,
            menu_id: menu.id,
            name: category.name,
            description: category.description,
            sort_order: category.sort_order,
          },
        });
        setNewCatName("");
        setNewCatDesc("");
        setShowAddCategory(false);
      }
    } catch (error) {
      console.error("Failed to create category:", error);
    } finally {
      setAddingCategory(false);
    }
  };

  const handleAddDish = async () => {
    if (!newDishName.trim() || !newDishPrice) return;
    setAddingDish(true);
    try {
      const res = await fetch("/api/dishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuId: menu.id,
          name: newDishName.trim(),
          description: newDishDesc.trim() || null,
          price: parseFloat(newDishPrice) || 0,
          image: newDishImage.trim() || null,
          weight: newDishWeight.trim() || null,
          calories: newDishCalories ? parseInt(newDishCalories) : null,
          allergens: newDishAllergens.trim() || null,
          tag_id: newDishTagId || null,
          categoryIds: newDishCategoryIds,
        }),
      });
      if (res.ok) {
        const dish = await res.json();
        dispatch({
          type: "CREATE_DISH",
          payload: {
            id: dish.id,
            menu_id: menu.id,
            name: dish.name,
            description: dish.description,
            price: dish.price,
            image: dish.image,
            weight: dish.weight,
            calories: dish.calories,
            allergens: dish.allergens,
            tag_id: dish.tag_id,
          },
        });

        for (const catId of newDishCategoryIds) {
          dispatch({
            type: "ADD_DISH_TO_CATEGORY",
            payload: { dishId: dish.id, categoryId: catId },
          });
        }

        setNewDishName("");
        setNewDishDesc("");
        setNewDishPrice("");
        setNewDishImage("");
        setNewDishWeight("");
        setNewDishCalories("");
        setNewDishAllergens("");
        setNewDishTagId("");
        setNewDishCategoryIds([]);
        setShowAddDish(false);
      }
    } catch (error) {
      console.error("Failed to create dish:", error);
    } finally {
      setAddingDish(false);
    }
  };

  const toggleDishCategory = (catId: string) => {
    setNewDishCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{menu.name}</h1>
            {menu.description && (
              <p className="text-gray-500 text-sm mt-0.5 truncate">{menu.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={viewMode === "categories" ? "primary" : "secondary"}
              onClick={() => setViewMode("categories")}
            >
              Категории
            </Button>
            <Button
              size="sm"
              variant={viewMode === "dishes" ? "primary" : "secondary"}
              onClick={() => setViewMode("dishes")}
            >
              Блюда
            </Button>
            <Button
              size="sm"
              variant={viewMode === "tags" ? "primary" : "secondary"}
              onClick={() => setViewMode("tags")}
            >
              Теги
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {viewMode === "categories" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Категории ({categories.length})
              </h2>
              <Button size="sm" onClick={() => setShowAddCategory(true)}>
                <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Добавить категорию</span>
                <span className="sm:hidden">Добавить</span>
              </Button>
            </div>

            {sortedCategories.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 sm:p-8 text-center">
                <p className="text-gray-500">Нет категорий</p>
                <p className="text-sm text-gray-400 mt-1">Добавьте первую категорию</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {sortedCategories.map((category, index) => {
                  const prevCategory = index > 0 ? sortedCategories[index - 1] : null;
                  const nextCategory = index < sortedCategories.length - 1 ? sortedCategories[index + 1] : null;
                  return (
                    <CategoryCard 
                      key={category.id} 
                      category={category} 
                      menuId={menu.id}
                      prevCategoryId={prevCategory?.id || null}
                      nextCategoryId={nextCategory?.id || null}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {viewMode === "dishes" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Блюда ({menuDishes.length})
              </h2>
              <Button size="sm" onClick={() => setShowAddDish(true)}>
                <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Добавить блюдо</span>
                <span className="sm:hidden">Добавить</span>
              </Button>
            </div>

            {menuDishes.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 sm:p-8 text-center">
                <p className="text-gray-500">Нет блюд</p>
                <p className="text-sm text-gray-400 mt-1">Добавьте первое блюдо</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {menuDishes.map((dish) => (
                  <DishCard key={dish.id} dish={dish} menuId={menu.id} />
                ))}
              </div>
            )}
          </div>
        )}

        {viewMode === "tags" && <TagsPanel />}
      </div>

      <Modal
        isOpen={showAddCategory}
        onClose={() => {
          setShowAddCategory(false);
          setNewCatName("");
          setNewCatDesc("");
        }}
        title="Добавить категорию"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddCategory(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddCategory} disabled={!newCatName.trim() || addingCategory}>
              {addingCategory ? "Добавление..." : "Добавить"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Название"
            placeholder="Салаты"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            autoFocus
          />
          <Input
            label="Описание (опционально)"
            placeholder="Свежие и легкие"
            value={newCatDesc}
            onChange={(e) => setNewCatDesc(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        isOpen={showAddDish}
        onClose={() => {
          setShowAddDish(false);
          setNewDishName("");
          setNewDishDesc("");
          setNewDishPrice("");
          setNewDishImage("");
          setNewDishWeight("");
          setNewDishCalories("");
          setNewDishAllergens("");
          setNewDishTagId("");
          setNewDishCategoryIds([]);
        }}
        title="Добавить блюдо"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddDish(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddDish} disabled={!newDishName.trim() || !newDishPrice || addingDish}>
              {addingDish ? "Добавление..." : "Добавить"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Название"
            placeholder="Цезарь"
            value={newDishName}
            onChange={(e) => setNewDishName(e.target.value)}
            autoFocus
          />
          <Textarea
            label="Описание"
            placeholder="С курицей, пармезаном и соусом"
            value={newDishDesc}
            onChange={(e) => setNewDishDesc(e.target.value)}
            rows={2}
          />
          <Input
            label="Цена"
            type="number"
            placeholder="350"
            value={newDishPrice}
            onChange={(e) => setNewDishPrice(e.target.value)}
            min="0"
          />
          <Input
            label="URL изображения"
            placeholder="https://example.com/image.jpg"
            value={newDishImage}
            onChange={(e) => setNewDishImage(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Вес/Объём"
              placeholder="200 г"
              value={newDishWeight}
              onChange={(e) => setNewDishWeight(e.target.value)}
            />
            <Input
              label="Ккал"
              type="number"
              placeholder="150"
              value={newDishCalories}
              onChange={(e) => setNewDishCalories(e.target.value)}
            />
          </div>
          <Input
            label="Аллергены"
            placeholder="Глютен, молоко, орехи"
            value={newDishAllergens}
            onChange={(e) => setNewDishAllergens(e.target.value)}
          />
          {state.tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Тег</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setNewDishTagId("")}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    !newDishTagId
                      ? "bg-gray-200 text-gray-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Без тега
                </button>
                {state.tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setNewDishTagId(tag.id)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      newDishTagId === tag.id
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {tag.emoji} {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {categories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Категории
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleDishCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      newDishCategoryIds.includes(cat.id)
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
