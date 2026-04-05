"use client";

import React, { useState } from "react";
import { useStore, Tag } from "@/lib/store-api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

const EMOJI_OPTIONS = ["⭐", "🔥", "🌶️", "❤️", "💎", "🏆", "✨", "💯", "👑", "🎉", "💥", "🥇", "🌟", "⚡️", "🔥"];

export function TagsPanel() {
  const { state, dispatch } = useStore();
  const currentUserOrg = state.userOrganizations.find(
    (organization) => organization.organization_id === state.activeOrganizationId
  );
  const isOwner = currentUserOrg?.role === "owner";
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [newTagEmoji, setNewTagEmoji] = useState("⭐");
  const [saving, setSaving] = useState(false);

  const tags = state.tags;

  const handleCreateTag = async () => {
    if (!newTagName.trim() || !state.activeOrganizationId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": state.activeOrganizationId,
        },
        body: JSON.stringify({
          name: newTagName.trim(),
          emoji: newTagEmoji,
        }),
      });
      if (res.ok) {
        const tag = await res.json();
        dispatch({ type: "CREATE_TAG", payload: tag });
        setNewTagName("");
        setNewTagEmoji("⭐");
        setShowAddModal(false);
      }
    } catch (error) {
      console.error("Failed to create tag:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTag = async () => {
    if (!editingTag || !newTagName.trim() || !state.activeOrganizationId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tags/${editingTag.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": state.activeOrganizationId,
        },
        body: JSON.stringify({
          name: newTagName.trim(),
          emoji: newTagEmoji,
        }),
      });
      if (res.ok) {
        const tag = await res.json();
        dispatch({ type: "UPDATE_TAG", payload: tag });
        setShowEditModal(false);
        setEditingTag(null);
      }
    } catch (error) {
      console.error("Failed to update tag:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!state.activeOrganizationId) return;
    try {
      const res = await fetch(`/api/tags/${tagId}`, {
        method: "DELETE",
        headers: { "x-organization-id": state.activeOrganizationId },
      });
      if (res.ok) {
        dispatch({ type: "DELETE_TAG", payload: tagId });
      }
    } catch (error) {
      console.error("Failed to delete tag:", error);
    }
  };

  const openEditModal = (tag: Tag) => {
    setEditingTag(tag);
    setNewTagName(tag.name);
    setNewTagEmoji(tag.emoji);
    setShowEditModal(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Теги ({tags.length})
        </h2>
        {isOwner && (
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Добавить тег</span>
        </Button>
        )}
      </div>

      {tags.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 sm:p-8 text-center">
          <p className="text-gray-500">Нет тегов</p>
          <p className="text-sm text-gray-400 mt-1">Создайте теги для блюд</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{tag.emoji}</span>
                <span className="font-medium text-gray-900">{tag.name}</span>
              </div>
              {isOwner && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEditModal(tag)}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDeleteTag(tag.id)}>
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setNewTagName("");
          setNewTagEmoji("⭐");
        }}
        title="Добавить тег"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreateTag} disabled={!newTagName.trim() || saving}>
              {saving ? "Сохранение..." : "Добавить"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Название"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Хит"
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Эмодзи</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setNewTagEmoji(emoji)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-colors ${
                    newTagEmoji === emoji
                      ? "bg-primary text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingTag(null);
          setNewTagName("");
          setNewTagEmoji("⭐");
        }}
        title="Редактировать тег"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Отмена
            </Button>
            <Button onClick={handleUpdateTag} disabled={!newTagName.trim() || saving}>
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Название"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Эмодзи</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setNewTagEmoji(emoji)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-colors ${
                    newTagEmoji === emoji
                      ? "bg-primary text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
