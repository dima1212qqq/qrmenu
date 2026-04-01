"use client";

import React, { useState } from "react";
import { signOut } from "next-auth/react";
import { useStore } from "@/lib/store-api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { QRModal } from "@/components/ui/QRModal";

interface SidebarProps {
  onShowWaiterCalls: () => void;
  onShowSettings: () => void;
  onShowUsers: () => void;
  isOpen?: boolean;
  onCloseSidebar?: () => void;
  organizationName: string;
  userName: string;
  userRole: string;
}

export function Sidebar({ 
  onShowWaiterCalls, 
  onShowSettings, 
  onShowUsers,
  isOpen = true, 
  onCloseSidebar,
  organizationName,
  userName,
  userRole 
}: SidebarProps) {
  const { state, dispatch } = useStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [menuToDelete, setMenuToDelete] = useState<{ id: string; name: string } | null>(null);
  const [newMenuName, setNewMenuName] = useState("");
  const [newMenuDesc, setNewMenuDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleCreateMenu = async () => {
    if (!newMenuName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMenuName.trim(),
          description: newMenuDesc.trim() || undefined,
        }),
      });
      if (res.ok) {
        const menu = await res.json();
        dispatch({ type: "CREATE_MENU", payload: menu });
        setNewMenuName("");
        setNewMenuDesc("");
        setShowCreateModal(false);
        onCloseSidebar?.();
      }
    } catch (error) {
      console.error("Failed to create menu:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteMenu = async () => {
    if (!menuToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/menus/${menuToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        dispatch({ type: "DELETE_MENU", payload: menuToDelete.id });
        setShowDeleteModal(false);
        setMenuToDelete(null);
      }
    } catch (error) {
      console.error("Failed to delete menu:", error);
    } finally {
      setDeleting(false);
    }
  };

  const confirmDelete = (menu: { id: string; name: string }) => {
    setMenuToDelete(menu);
    setShowDeleteModal(true);
  };

  const selectMenu = (menuId: string) => {
    dispatch({ type: "SET_ACTIVE_MENU", payload: menuId });
    onCloseSidebar?.();
  };

  const activeMenu = state.menus.find((m) => m.id === state.activeMenuId);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <span className="font-semibold text-gray-900 text-sm">Menu QR</span>
            </div>
          </div>
          <button
            onClick={onCloseSidebar}
            className="p-1 text-gray-400 hover:text-gray-600 lg:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {organizationName && (
          <p className="text-xs text-gray-500 mt-1 truncate">{organizationName}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Меню
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="h-7 w-7 p-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Button>
        </div>

        {state.menus.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            Нет меню
          </p>
        ) : (
          <div className="space-y-1">
            {state.menus.map((menu) => (
              <div
                key={menu.id}
                className={`group relative w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  state.activeMenuId === menu.id
                    ? "bg-primary/10 text-primary"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <button
                  onClick={() => selectMenu(menu.id)}
                  className="w-full"
                >
                  <div className="font-medium truncate">{menu.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {state.categories.filter((c) => c.menu_id === menu.id).length > 0
                      ? `${state.categories.filter((c) => c.menu_id === menu.id).length} категор.`
                      : "Нажмите для загрузки"}
                  </div>
                </button>
                {userRole === "owner" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete({ id: menu.id, name: menu.name });
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded transition-all"
                  >
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-200 space-y-2">
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            onShowWaiterCalls();
            onCloseSidebar?.();
          }}
        >
          <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <span className="truncate">Вызовы</span>
        </Button>

        {userRole === "owner" && (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              onShowUsers();
              onCloseSidebar?.();
            }}
          >
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="truncate">Сотрудники</span>
          </Button>
        )}

        {userRole === "owner" && (
          <>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                onShowSettings();
                onCloseSidebar?.();
              }}
            >
              <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">Настройки</span>
            </Button>

            {activeMenu && state.organization?.slug && (
              <>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    const url = `${window.location.origin}/menu/${state.organization?.slug}/${activeMenu.id}?share=true`;
                    navigator.clipboard.writeText(url);
                    alert("Ссылка скопирована!");
                  }}
                >
                  <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span className="truncate">Копировать ссылку</span>
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setShowQRModal(true)}
                >
                  <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  <span className="truncate">QR Код</span>
                </Button>
              </>
            )}
          </>
        )}

        <div className="pt-2 border-t border-gray-200">
          <div className="px-3 py-2 text-xs text-gray-500">
            <p className="font-medium truncate">{userName}</p>
            <p className="text-gray-400">{userRole === "owner" ? "Владелец" : "Официант"}</p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:bg-red-50"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="truncate">Выйти</span>
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-60 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:z-auto
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {sidebarContent}
      </aside>

      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewMenuName("");
          setNewMenuDesc("");
        }}
        title="Создать меню"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreateMenu} disabled={!newMenuName.trim() || creating}>
              {creating ? "Создание..." : "Создать"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Название"
            placeholder="Основное меню"
            value={newMenuName}
            onChange={(e) => setNewMenuName(e.target.value)}
            autoFocus
          />
          <Input
            label="Описание (опционально)"
            placeholder="Меню ресторана"
            value={newMenuDesc}
            onChange={(e) => setNewMenuDesc(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setMenuToDelete(null);
        }}
        title="Удалить меню?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Отмена
            </Button>
            <Button variant="danger" onClick={handleDeleteMenu} disabled={deleting}>
              {deleting ? "Удаление..." : "Удалить"}
            </Button>
          </>
        }
      >
        <p className="text-gray-600">
          Меню &quot;{menuToDelete?.name}&quot; будет удалено навсегда. Все категории и блюда также будут удалены.
        </p>
      </Modal>

      {activeMenu && (
        <QRModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          menuId={activeMenu.id}
          menuName={activeMenu.name}
          orgSlug={state.organization?.slug || ""}
        />
      )}
    </>
  );
}
