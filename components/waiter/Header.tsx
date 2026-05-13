'use client';

import { useState } from 'react';

interface ActiveOrganization {
  id: string;
  name: string;
  slug: string;
  menus?: { id: string; name: string }[];
}

interface User {
  id: string;
  name: string;
  role: string;
}

interface HeaderProps {
  organizations: ActiveOrganization[];
  currentOrg: ActiveOrganization | null;
  onOrgChange: (org: ActiveOrganization) => void;
  user: User | null;
}

export function Header({ organizations, currentOrg, onOrgChange, user }: HeaderProps) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <span className="text-xl">🏠</span>
          <span className="font-semibold text-gray-900">
            {currentOrg?.name || 'Выберите заведение'}
          </span>
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          {user && (
            <span className="text-sm text-gray-600">{user.name}</span>
          )}
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {showPicker && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
          <div className="absolute left-4 right-4 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  onOrgChange(org);
                  setShowPicker(false);
                }}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                  currentOrg?.id === org.id ? 'bg-orange-50' : ''
                }`}
              >
                <span>🏠</span>
                <span className="font-medium">{org.name}</span>
                {currentOrg?.id === org.id && (
                  <span className="ml-auto text-green-600">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </header>
  );
}
