import { NextRequest, NextResponse } from "next/server";
import { createWaiterCall, getMenu, getOrganizationBySlug, sendTelegramNotification } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; menuId: string } }
) {
  try {
    const { orgSlug, menuId } = params;
    const { tableNumber } = await request.json();

    if (!menuId) {
      return NextResponse.json({ error: "menuId is required" }, { status: 400 });
    }

    const org = await getOrganizationBySlug(orgSlug);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const menu = await getMenu(menuId);
    if (!menu || menu.organization_id !== org.id) {
      return NextResponse.json({ error: "Menu not found" }, { status: 404 });
    }

    const call = await createWaiterCall({
      id: uuidv4(),
      menu_id: menuId,
      table_number: tableNumber || null,
      created_at: Date.now(),
      status: "pending",
    });

    const settings = org.settings;

    if (settings.telegramBotToken && settings.telegramChatId) {
      const message = `рџ”” <b>Р’С‹Р·РѕРІ РѕС„РёС†РёР°РЅС‚Р°!</b>\nрџ“‹ РњРµРЅСЋ: ${menu.name}\nрџЄ‘ РЎС‚РѕР»: ${tableNumber || "РЅРµ СѓРєР°Р·Р°РЅ"}\nвЏ° ${new Date().toLocaleTimeString("ru-RU")}`;
      await sendTelegramNotification(message, settings.telegramBotToken, settings.telegramChatId);
    }

    return NextResponse.json(call, { status: 201 });
  } catch (error) {
    console.error("Failed to create waiter call:", error);
    return NextResponse.json({ error: "Failed to create waiter call" }, { status: 500 });
  }
}
