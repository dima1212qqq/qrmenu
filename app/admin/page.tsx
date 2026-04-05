"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { StoreProvider, useStore } from "@/lib/store-api";
import { Sidebar } from "@/components/admin/Sidebar";
import { MenuEditor } from "@/components/admin/MenuEditor";
import { WaiterCalls } from "@/components/admin/WaiterCalls";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import { UsersPanel } from "@/components/admin/UsersPanel";

function AdminLayoutContent() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const { state, refreshData, refreshUsers } = useStore();
  const [showWaiterCalls, setShowWaiterCalls] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (state.activeOrganizationId) {
      refreshUsers();
    }
  }, [state.activeOrganizationId, refreshUsers]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const currentUserOrg = state.userOrganizations.find(
    (uo) => uo.organization_id === state.activeOrganizationId
  );
  const isOwner = currentUserOrg?.role === "owner";

  if (state.loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background">
      <Sidebar 
        onShowWaiterCalls={() => setShowWaiterCalls(true)} 
        onShowSettings={() => setShowSettings(true)}
        onShowUsers={() => setShowUsers(true)}
        isOpen={sidebarOpen}
        onCloseSidebar={() => setSidebarOpen(false)}
        userName={user?.name || ""}
      />
      
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold text-gray-900">Menu QR</span>
        </header>
        
        <MenuEditor />
      </div>
      
      {showWaiterCalls && (
        <WaiterCalls onClose={() => setShowWaiterCalls(false)} />
      )}
      
      {showSettings && (
        <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
      )}

      {showUsers && isOwner && (
        <UsersPanel isOpen={showUsers} onClose={() => setShowUsers(false)} />
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <StoreProvider>
      <AdminLayoutContent />
    </StoreProvider>
  );
}
