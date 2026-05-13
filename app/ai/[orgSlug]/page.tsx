"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AIChatWidget } from "@/components/ui/AIChatWidget";
import { CartProvider } from "@/components/ui/CartContext";

interface OrgData {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  menus: {
    id: string;
    name: string;
  }[];
}

export default function AIChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orgSlug = params.orgSlug as string;
  const tableNumber = searchParams.get("table");
  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchOrg() {
      try {
        const res = await fetch(`/api/public/org/${orgSlug}`);
        if (!res.ok) {
          throw new Error("Restaurant not found");
        }
        const data = await res.json();
        setOrgData(data);
      } catch (err) {
        setError("Ресторан не найден");
      } finally {
        setLoading(false);
      }
    }
    if (orgSlug) {
      fetchOrg();
    }
  }, [orgSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  if (error || !orgData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-2">Ошибка</h1>
          <p className="text-slate-400">{error || "Ресторан не найден"}</p>
        </div>
      </div>
    );
  }

  const menuId = orgData.menus[0]?.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      
      <div className="absolute top-0 left-0 right-0 pt-8 pb-4 text-center">
        <h1 className="text-2xl font-bold text-white drop-shadow-lg">{orgData.organization.name}</h1>
        {tableNumber && (
          <p className="text-sm text-slate-300 mt-1">Стол №{tableNumber}</p>
        )}
      </div>

      <CartProvider orgSlug={orgSlug}>
        <AIChatWidget
          organizationSlug={orgSlug}
          menuId={menuId}
          tableNumber={tableNumber}
          onClose={() => window.close()}
        />
      </CartProvider>
    </div>
  );
}
