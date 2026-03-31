"use client";

import React, { useState, useEffect } from "react";
import { useStore } from "@/lib/store-api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

interface UsersPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UsersPanel({ isOpen, onClose }: UsersPanelProps) {
  const { state, dispatch, refreshUsers } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "" });
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) return;
    setAdding(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      if (res.ok) {
        const user = await res.json();
        dispatch({ type: "ADD_USER", payload: user });
        setNewUser({ name: "", email: "", password: "" });
        setShowAddModal(false);
      }
    } catch (error) {
      console.error("Failed to add user:", error);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        dispatch({ type: "DELETE_USER", payload: userToDelete.id });
        setShowDeleteModal(false);
        setUserToDelete(null);
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
    } finally {
      setDeleting(false);
    }
  };

  const confirmDelete = (user: { id: string; name: string }) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const owner = state.users.find((u) => u.role === "owner");
  const waiters = state.users.filter((u) => u.role === "waiter");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md h-full overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Сотрудники</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-6">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Владелец
            </h3>
            {owner && (
              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{owner.name}</p>
                  <p className="text-sm text-gray-500 truncate">{owner.email}</p>
                </div>
                <span className="text-xs text-gray-400">Владелец</span>
              </div>
            )}
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Официанты ({waiters.length})
              </h3>
              <Button size="sm" onClick={() => setShowAddModal(true)}>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Добавить
              </Button>
            </div>

            {waiters.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <p className="text-gray-500 text-sm">Нет официантов</p>
                <p className="text-gray-400 text-xs mt-1">Добавьте официантов для приёма вызовов</p>
              </div>
            ) : (
              <div className="space-y-2">
                {waiters.map((user) => (
                  <div
                    key={user.id}
                    className="bg-gray-50 rounded-lg p-3 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => confirmDelete({ id: user.id, name: user.name })}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setNewUser({ name: "", email: "", password: "" });
        }}
        title="Добавить официанта"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddUser} disabled={!newUser.name || !newUser.email || !newUser.password || adding}>
              {adding ? "Добавление..." : "Добавить"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Имя"
            placeholder="Иван Петров"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            autoFocus
          />
          <Input
            label="Email"
            type="email"
            placeholder="ivan@restaurant.com"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          />
          <Input
            label="Пароль"
            type="password"
            placeholder="Минимум 6 символов"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
          />
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setUserToDelete(null);
        }}
        title="Удалить сотрудника?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Отмена
            </Button>
            <Button variant="danger" onClick={handleDeleteUser} disabled={deleting}>
              {deleting ? "Удаление..." : "Удалить"}
            </Button>
          </>
        }
      >
        <p className="text-gray-600">
          Официант &quot;{userToDelete?.name}&quot; будет удалён. Он больше не сможет входить в систему.
        </p>
      </Modal>
    </div>
  );
}
