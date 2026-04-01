"use client";

import React, { useState, useMemo } from "react";
import { useStore, Dish, Category, Tag } from "@/lib/store-api";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

interface DishCardProps {
  dish: Dish;
  menuId: string;
}

export function DishCard({ dish, menuId }: DishCardProps) {
  const { state, dispatch } = useStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editName, setEditName] = useState(dish.name);
  const [editDesc, setEditDesc] = useState(dish.description || "");
  const [editPrice, setEditPrice] = useState(dish.price.toString());
  const [editImage, setEditImage] = useState(dish.image || "");
  const [editWeight, setEditWeight] = useState(dish.weight || "");
  const [editCalories, setEditCalories] = useState(dish.calories?.toString() || "");
  const [editAllergens, setEditAllergens] = useState(dish.allergens || "");
  const [editTagId, setEditTagId] = useState<string>(dish.tag_id || "");
  const [editCategoryIds, setEditCategoryIds] = useState<string[]>(
    state.dishCategories.filter((dc) => dc.dish_id === dish.id).map((dc) => dc.category_id)
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const categories = useMemo(
    () => state.categories.filter((c) => c.menu_id === menuId),
    [state.categories, menuId]
  );

  const dishCategoryIds = useMemo(
    () => state.dishCategories.filter((dc) => dc.dish_id === dish.id).map((dc) => dc.category_id),
    [state.dishCategories, dish.id]
  );

  const tags = useMemo(() => state.tags, [state.tags]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const { url } = await res.json();
        setEditImage(url);
      }
    } catch (error) {
      console.error("Failed to upload image:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!editName.trim() || !editPrice) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/dishes/${dish.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim() || null,
          price: parseFloat(editPrice) || 0,
          image: editImage.trim() || null,
          weight: editWeight.trim() || null,
          calories: editCalories ? parseInt(editCalories) : null,
          allergens: editAllergens.trim() || null,
          tag_id: editTagId || null,
          categoryIds: editCategoryIds,
        }),
      });
      if (res.ok) {
        dispatch({
          type: "UPDATE_DISH",
          payload: {
            ...dish,
            name: editName.trim(),
            description: editDesc.trim() || null,
            price: parseFloat(editPrice) || 0,
            image: editImage.trim() || null,
            weight: editWeight.trim() || null,
            calories: editCalories ? parseInt(editCalories) : null,
            allergens: editAllergens.trim() || null,
            tag_id: editTagId || null,
          },
        });

        categories.forEach((cat) => {
          const hadDish = dishCategoryIds.includes(cat.id);
          const hasDish = editCategoryIds.includes(cat.id);
          
          if (hadDish && !hasDish) {
            dispatch({
              type: "REMOVE_DISH_FROM_CATEGORY",
              payload: { dishId: dish.id, categoryId: cat.id },
            });
          } else if (!hadDish && hasDish) {
            dispatch({
              type: "ADD_DISH_TO_CATEGORY",
              payload: { dishId: dish.id, categoryId: cat.id },
            });
          }
        });

        setShowEditModal(false);
      }
    } catch (error) {
      console.error("Failed to update dish:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await fetch(`/api/dishes/${dish.id}`, { method: "DELETE" });
      dispatch({ type: "DELETE_DISH", payload: { menuId, dishId: dish.id } });
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Failed to delete dish:", error);
    }
  };

  const toggleCategory = (catId: string) => {
    setEditCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const dishTag = useMemo(() => {
    return tags.find((t) => t.id === dish.tag_id);
  }, [tags, dish.tag_id]);

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
        <div className="flex w-full">
          {dish.image && (
            <div className="w-16 h-16 sm:w-24 sm:h-24 flex-shrink-0">
              <img
                src={dish.image}
                alt={dish.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
          <div className={`p-3 sm:p-4 min-w-0 ${dish.image ? "" : "flex-1"}`}>
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">{dish.name}</h3>
                  {dishTag && (
                    <span className="text-lg" title={dishTag.name}>{dishTag.emoji}</span>
                  )}
                </div>
                {dish.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{dish.description}</p>
                )}
                {(dish.weight || dish.calories) && (
                  <p className="text-xs text-gray-400 mt-1">
                    {dish.weight && `${dish.weight}`}
                    {dish.weight && dish.calories && " • "}
                    {dish.calories && `${dish.calories} ккал`}
                  </p>
                )}
              </div>
              <p className="text-base sm:text-lg font-semibold text-primary flex-shrink-0 ml-2">
                {formatPrice(dish.price)}
              </p>
            </div>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {dishCategoryIds
                  .map((id) => categories.find((c) => c.id === id))
                  .filter(Boolean)
                  .map((cat) => (
                    <span
                      key={cat!.id}
                      className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                    >
                      {cat!.name}
                    </span>
                  ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1 p-2 border-l border-gray-100">
            <Button variant="ghost" size="sm" onClick={() => setShowEditModal(true)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(true)}>
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditName(dish.name);
          setEditDesc(dish.description || "");
          setEditPrice(dish.price.toString());
          setEditImage(dish.image || "");
          setEditWeight(dish.weight || "");
          setEditCalories(dish.calories?.toString() || "");
          setEditAllergens(dish.allergens || "");
          setEditTagId(dish.tag_id || "");
          setEditCategoryIds(dishCategoryIds);
        }}
        title="Редактировать блюдо"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={!editName.trim() || !editPrice || saving}>
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Название"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            autoFocus
          />
          <Textarea
            label="Описание"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            rows={2}
          />
          <Input
            label="Цена"
            type="number"
            value={editPrice}
            onChange={(e) => setEditPrice(e.target.value)}
            min="0"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Изображение</label>
            <div className="flex gap-2">
              <Input
                value={editImage}
                onChange={(e) => setEditImage(e.target.value)}
                placeholder="URL или загрузите файл"
                className="flex-1"
              />
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="dish-image-upload"
                />
                <Button variant="secondary" type="button" disabled={uploading} className="pointer-events-none">
                  {uploading ? "..." : "Загрузить"}
                </Button>
              </div>
            </div>
            {editImage && (
              <img src={editImage} alt="Preview" className="mt-2 w-24 h-24 object-cover rounded-lg" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Вес/Объём"
              value={editWeight}
              onChange={(e) => setEditWeight(e.target.value)}
              placeholder="200 г"
            />
            <Input
              label="Ккал"
              type="number"
              value={editCalories}
              onChange={(e) => setEditCalories(e.target.value)}
              placeholder="150"
            />
          </div>
          <Input
            label="Аллергены"
            value={editAllergens}
            onChange={(e) => setEditAllergens(e.target.value)}
            placeholder="Глютен, молоко, орехи"
          />
          {tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Тег</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEditTagId("")}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    !editTagId
                      ? "bg-gray-200 text-gray-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Без тега
                </button>
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setEditTagId(tag.id)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      editTagId === tag.id
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
                    onClick={() => toggleCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      editCategoryIds.includes(cat.id)
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
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Удалить блюдо?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
              Отмена
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Удалить
            </Button>
          </>
        }
      >
        <p className="text-gray-600">
          Блюдо &quot;{dish.name}&quot; будет удалено навсегда.
        </p>
      </Modal>
    </>
  );
}
