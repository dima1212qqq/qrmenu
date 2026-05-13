'use client';

import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/waiter/Header';
import { StatsBar } from '@/components/waiter/StatsBar';
import { Tabs } from '@/components/waiter/Tabs';
import { CallsList } from '@/components/waiter/CallsList';
import { OrdersList } from '@/components/waiter/OrdersList';
import { EmptyState } from '@/components/waiter/EmptyState';
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

interface WaiterCall {
  id: string;
  menuId: string;
  tableNumber: string | null;
  createdAt: string;
  status: 'pending' | 'completed';
}

interface OrderItem {
  id: string;
  dishId: string;
  dishName: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  menuId: string;
  organizationId: string;
  tableNumber: string | null;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'completed';
  createdAt: string;
}

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

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export default function WaiterDashboard() {
  const [activeTab, setActiveTab] = useState<'calls' | 'orders'>('calls');
  const [calls, setCalls] = useState<WaiterCall[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [organizations, setOrganizations] = useState<ActiveOrganization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<ActiveOrganization | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const fcmInitialized = useRef(false);

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const sessionRes = await fetch('/api/auth/session');
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData?.user) {
            setUser(sessionData.user);
          }
        }
      } catch (error) {
        console.error('Failed to fetch session:', error);
      }
    }
    fetchInitialData();
  }, []);

  useEffect(() => {
    async function fetchOrganizations() {
      try {
        const res = await fetch('/api/organizations');
        if (res.ok) {
          const data = await res.json();
          setOrganizations(data);
          if (data.length > 0 && !currentOrg) {
            setCurrentOrg(data[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch organizations:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (!currentOrg || !user) return;

    const fetchData = async () => {
      try {
        const headers = { 'x-organization-id': currentOrg.id };

        const [callsRes, ordersRes] = await Promise.all([
          fetch('/api/waiter', { headers }),
          fetch('/api/orders/active', { headers }),
        ]);

        if (callsRes.ok) {
          const callsData = await callsRes.json();
          setCalls(Array.isArray(callsData) ? callsData.filter((c: WaiterCall) => c.status === 'pending') : []);
        }

        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setOrders(Array.isArray(ordersData) ? ordersData.filter((o: Order) => o.status === 'pending') : []);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [currentOrg, user]);

  useEffect(() => {
    async function initFCM() {
      if (fcmInitialized.current || !currentOrg || !user) return;

      try {
        const supported = await isSupported();
        if (!supported) {
          console.log('Firebase Messaging not supported');
          return;
        }

        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        const messaging = getMessaging(app);

        const registration = await navigator.serviceWorker.register('/waiter-sw.js');
        console.log('Service Worker registered:', registration);

        const { getToken } = await import('firebase/messaging');
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Notification permission denied');
          return;
        }

        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        if (token) {
          console.log('FCM Token obtained');
          await fetch('/api/notifications/fcm/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fcmToken: token,
              organizationId: currentOrg.id,
              deviceName: navigator.userAgent,
            }),
          });
          fcmInitialized.current = true;
        }
      } catch (error) {
        console.error('FCM initialization failed:', error);
      }
    }

    initFCM();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'NOTIFICATION_CLICK') {
          console.log('Notification clicked:', event.data);
          if (event.data.action === 'accept' || event.data.action === 'view') {
            setActiveTab(event.data.data?.type === 'call' ? 'calls' : 'orders');
          }
        }
      });
    }
  }, [currentOrg, user]);

  const handleAcceptCall = async (id: string) => {
    try {
      await fetch(`/api/waiter/${id}`, { method: 'PATCH' });
      setCalls(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Failed to accept call:', error);
    }
  };

  const handleCompleteOrder = async (id: string) => {
    try {
      await fetch(`/api/orders/${id}/complete`, { method: 'PATCH' });
      setOrders(prev => prev.filter(o => o.id !== id));
    } catch (error) {
      console.error('Failed to complete order:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header
        organizations={organizations}
        currentOrg={currentOrg}
        onOrgChange={setCurrentOrg}
        user={user}
      />
      <StatsBar callsCount={calls.length} ordersCount={orders.length} />
      <Tabs active={activeTab} onChange={setActiveTab} />
      
      <main className="p-4">
        {activeTab === 'calls' ? (
          calls.length > 0 ? (
            <CallsList calls={calls} onAccept={handleAcceptCall} />
          ) : (
            <EmptyState
              icon="🔔"
              title="Нет активных вызовов"
              description="Вызовы от гостей появятся здесь"
            />
          )
        ) : orders.length > 0 ? (
          <OrdersList orders={orders} onComplete={handleCompleteOrder} />
        ) : (
          <EmptyState
            icon="📦"
            title="Нет активных заказов"
            description="Заказы из чата появятся здесь"
          />
        )}
      </main>
    </div>
  );
}
