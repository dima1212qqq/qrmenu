"use client";

import React, { useState } from "react";
import { useStore, Category } from "@/lib/store-api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

interface CategoryCardProps {
  category: Category;
  menuId: string;
  prevCategoryId: string | null;
  nextCategoryId: string | null;
}

export function CategoryCard({ category, menuId, prevCategoryId, nextCategoryId }: CategoryCardProps) {
  const { state, dispatch } = useStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [editDesc, setEditDesc] = useState(category.description || "");
  const [saving, setSaving] = useState(false);

  const dishCount = state.dishCategories.filter((dc) => dc.category_id === category.id).length;

  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim() || undefined,
        }),
      });
      if (res.ok) {
        dispatch({
          type: "UPDATE_CATEGORY",
          payload: { ...category, name: editName.trim(), description: editDesc.trim() || undefined },
        });
        setShowEditModal(false);
      }
    } catch (error) {
      console.error("Failed to update category:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
      dispatch({ type: "DELETE_CATEGORY", payload: { menuId: category.menu_id, categoryId: category.id } });
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Failed to delete category:", error);
    }
  };

  const handleMoveUp = async () => {
    if (!prevCategoryId) return;
    try {
      await fetch(`/api/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swapWithId: prevCategoryId }),
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to move category:", error);
    }
  };

  const handleMoveDown = async () => {
    if (!nextCategoryId) return;
    try {
      await fetch(`/api/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swapWithId: nextCategoryId }),
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to move category:", error);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <span className="text-lg">📂</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900">{category.name}</h3>
            {category.description && (
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{category.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-2">{dishCount} блюд</p>
          </div>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleMoveUp}
              disabled={!prevCategoryId}
              title="Переместить вверх"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleMoveDown}
              disabled={!nextCategoryId}
              title="Переместить вниз"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
            <div className="w-px h-6 bg-gray-200 mx-1" />
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
          setEditName(category.name);
          setEditDesc(category.description || "");
        }}
        title="Редактировать категорию"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={!editName.trim() || saving}>
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
          <Input
            label="Описание (опционально)"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Удалить категорию?"
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
          Категория &quot;{category.name}&quot; будет удалена. Блюда останутся в меню, но перестанут быть привязаны к этой категории.
        </p>
      </Modal>
    </>
  );
}
