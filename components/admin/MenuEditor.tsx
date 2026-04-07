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
import { useRouter } from "next/navigation";

export function MenuEditor() {
  const { state, dispatch } = useStore();
  const menu = useActiveMenu();
  const categories = useCategoriesForMenu(menu?.id || null);
  const menuDishes = useDishesForMenu(menu?.id || null);
  const currentUserOrg = state.userOrganizations.find(
    (organization) => organization.organization_id === state.activeOrganizationId
  );
  const isOwner = currentUserOrg?.role === "owner";
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
  const [viewMode, setViewMode] = useState<"categories" | "dishes" | "tags" | "bulk-prices">("categories");
  const [addingCategory, setAddingCategory] = useState(false);
  const [addingDish, setAddingDish] = useState(false);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [copyTargetOrgId, setCopyTargetOrgId] = useState("");
  const [copyNewName, setCopyNewName] = useState("");
  const [copying, setCopying] = useState(false);
  const [showEditMenu, setShowEditMenu] = useState(false);
  const [editMenuName, setEditMenuName] = useState("");
  const [editMenuDesc, setEditMenuDesc] = useState("");
  const [updatingMenu, setUpdatingMenu] = useState(false);
  const [bulkPriceChanges, setBulkPriceChanges] = useState<Record<string, string>>({});
  const [bulkPriceLoading, setBulkPriceLoading] = useState(false);
  const router = useRouter();

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
    if (!newCatName.trim() || !state.activeOrganizationId) return;
    setAddingCategory(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": state.activeOrganizationId,
        },
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
    if (!newDishName.trim() || !newDishPrice || !state.activeOrganizationId) return;
    setAddingDish(true);
    try {
      const res = await fetch("/api/dishes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": state.activeOrganizationId,
        },
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

  const handleCopyMenu = async () => {
    if (!menu || !copyTargetOrgId) return;
    setCopying(true);
    try {
      const res = await fetch("/api/menus/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceMenuId: menu.id,
          targetOrgId: copyTargetOrgId,
          newName: copyNewName.trim() || undefined,
        }),
      });
      if (res.ok) {
        const newMenu = await res.json();
        if (state.activeOrganizationId === copyTargetOrgId) {
          dispatch({ type: "CREATE_MENU", payload: newMenu });
        }
        setShowCopyMenu(false);
        setCopyTargetOrgId("");
        setCopyNewName("");
        if (state.activeOrganizationId !== copyTargetOrgId) {
          router.refresh();
        }
      } else {
        const error = await res.json();
        alert(error.error || "Ошибка при копировании меню");
      }
    } catch (error) {
      console.error("Failed to copy menu:", error);
      alert("Ошибка при копировании меню");
    } finally {
      setCopying(false);
    }
  };

  const handleUpdateMenu = async () => {
    if (!menu || !editMenuName.trim()) return;
    setUpdatingMenu(true);
    try {
      const res = await fetch(`/api/menus/${menu.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": state.activeOrganizationId || "",
        },
        body: JSON.stringify({
          name: editMenuName.trim(),
          description: editMenuDesc.trim() || null,
        }),
      });
      if (res.ok) {
        const updatedMenu = await res.json();
        dispatch({ type: "UPDATE_MENU", payload: updatedMenu });
        setShowEditMenu(false);
      } else {
        const error = await res.json();
        alert(error.error || "Ошибка при обновлении меню");
      }
    } catch (error) {
      console.error("Failed to update menu:", error);
      alert("Ошибка при обновлении меню");
    } finally {
      setUpdatingMenu(false);
    }
  };

  const handleBulkPriceChange = async () => {
    const changes = Object.entries(bulkPriceChanges)
      .filter(([_, newPrice]) => newPrice.trim() !== "")
      .map(([id, newPrice]) => ({ id, price: parseFloat(newPrice) }));

    if (changes.length === 0) {
      alert("Укажите новые цены для хотя бы одного блюда");
      return;
    }

    setBulkPriceLoading(true);
    try {
      const res = await fetch("/api/dishes/bulk-price", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": state.activeOrganizationId || "",
        },
        body: JSON.stringify({ dishes: changes }),
      });
      if (res.ok) {
        const updatedDishes = await res.json();
        for (const dish of updatedDishes) {
          dispatch({ type: "UPDATE_DISH", payload: dish });
        }
        setBulkPriceChanges({});
        setViewMode("dishes");
        alert("Цены обновлены!");
      } else {
        const error = await res.json();
        alert(error.error || "Ошибка при изменении цен");
      }
    } catch (error) {
      console.error("Failed to bulk update prices:", error);
      alert("Ошибка при изменении цен");
    } finally {
      setBulkPriceLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{menu.name}</h1>
            {isOwner && (
              <button
                onClick={() => {
                  setEditMenuName(menu.name);
                  setEditMenuDesc(menu.description || "");
                  setShowEditMenu(true);
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Редактировать название"
              >
                <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
            {menu.description && (
              <p className="text-gray-500 text-sm mt-0.5 truncate hidden sm:block">{menu.description}</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {isOwner && (
              <>
                <Button
                  size="sm"
                  variant={viewMode === "bulk-prices" ? "primary" : "secondary"}
                  onClick={() => setViewMode("bulk-prices")}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Изменить цены
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setCopyNewName(`${menu.name} (Copy)`);
                    setShowCopyMenu(true);
                  }}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Копировать
                </Button>
              </>
            )}
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
              {isOwner && (
                <Button size="sm" onClick={() => setShowAddCategory(true)}>
                <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Добавить категорию</span>
                <span className="sm:hidden">Добавить</span>
              </Button>
              )}
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
              {isOwner && (
                <Button size="sm" onClick={() => setShowAddDish(true)}>
                <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Добавить блюдо</span>
                <span className="sm:hidden">Добавить</span>
              </Button>
              )}
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

        {viewMode === "bulk-prices" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Изменение цен
              </h2>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setBulkPriceChanges({});
                    setViewMode("dishes");
                  }}
                >
                  Отмена
                </Button>
                <Button
                  size="sm"
                  onClick={handleBulkPriceChange}
                  disabled={bulkPriceLoading}
                >
                  {bulkPriceLoading ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </div>

            {menuDishes.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 sm:p-8 text-center">
                <p className="text-gray-500">Нет блюд</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500">
                  <div className="col-span-5">Блюдо</div>
                  <div className="col-span-3">Старая цена</div>
                  <div className="col-span-4">Новая цена</div>
                </div>
                {menuDishes.map((dish) => (
                  <div key={dish.id} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 last:border-b-0 items-center">
                    <div className="col-span-5">
                      <div className="font-medium text-gray-900">{dish.name}</div>
                      {dish.description && (
                        <div className="text-sm text-gray-400 truncate">{dish.description}</div>
                      )}
                    </div>
                    <div className="col-span-3 text-gray-500">
                      {formatPrice(dish.price)}
                    </div>
                    <div className="col-span-4">
                      <Input
                        type="number"
                        placeholder="Не менять"
                        value={bulkPriceChanges[dish.id] || ""}
                        onChange={(e) => setBulkPriceChanges((prev) => ({
                          ...prev,
                          [dish.id]: e.target.value,
                        }))}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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

      <Modal
        isOpen={showCopyMenu}
        onClose={() => {
          setShowCopyMenu(false);
          setCopyTargetOrgId("");
          setCopyNewName("");
        }}
        title="Копировать меню"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCopyMenu(false)}>
              Отмена
            </Button>
            <Button onClick={handleCopyMenu} disabled={!copyTargetOrgId || copying}>
              {copying ? "Копирование..." : "Копировать"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Копировать меню &quot;{menu?.name}&quot; в другое заведение
          </p>
          <Input
            label="Новое название"
            placeholder="Название меню"
            value={copyNewName}
            onChange={(e) => setCopyNewName(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Заведение</label>
            <select
              value={copyTargetOrgId}
              onChange={(e) => setCopyTargetOrgId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Выберите заведение</option>
              {state.organizations
                .filter((org) => {
                  const uo = state.userOrganizations.find((uo) => uo.organization_id === org.id);
                  return uo?.role === "owner";
                })
                .map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showEditMenu}
        onClose={() => setShowEditMenu(false)}
        title="Редактировать меню"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditMenu(false)}>
              Отмена
            </Button>
            <Button onClick={handleUpdateMenu} disabled={!editMenuName.trim() || updatingMenu}>
              {updatingMenu ? "Сохранение..." : "Сохранить"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Название"
            placeholder="Название меню"
            value={editMenuName}
            onChange={(e) => setEditMenuName(e.target.value)}
            autoFocus
          />
          <Input
            label="Описание (опционально)"
            placeholder="Описание меню"
            value={editMenuDesc}
            onChange={(e) => setEditMenuDesc(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
