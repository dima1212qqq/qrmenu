import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createWaiterCall,
  getMenu,
  getOrganizationSettings,
  getUserOrganization,
  getWaiterCallsForOrganization,
  sendTelegramNotification,
} from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const orgId = request.headers.get("x-organization-id");
    if (!orgId) {
      return NextResponse.json({ error: "x-organization-id header is required" }, { status: 400 });
    }

    const userOrg = await getUserOrganization(user.id, orgId);
    if (!userOrg) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const menuId = searchParams.get("menuId");

    let calls;
    if (menuId) {
      const menu = await getMenu(menuId);
      if (!menu || menu.organization_id !== orgId) {
        return NextResponse.json({ error: "Menu not found" }, { status: 404 });
      }
      calls = (await getWaiterCallsForOrganization(orgId)).filter((call) => call.menu_id === menuId);
    } else {
      calls = await getWaiterCallsForOrganization(orgId);
    }

    return NextResponse.json(calls);
  } catch (error) {
    console.error("Failed to fetch waiter calls:", error);
    return NextResponse.json({ error: "Failed to fetch waiter calls" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const orgId = request.headers.get("x-organization-id");
    if (!orgId) {
      return NextResponse.json({ error: "x-organization-id header is required" }, { status: 400 });
    }

    const userOrg = await getUserOrganization(user.id, orgId);
    if (!userOrg) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { menuId, tableNumber } = await request.json();

    if (!menuId) {
      return NextResponse.json({ error: "menuId is required" }, { status: 400 });
    }

    const menu = await getMenu(menuId);
    if (!menu || menu.organization_id !== orgId) {
      return NextResponse.json({ error: "Menu not found" }, { status: 404 });
    }

    const call = await createWaiterCall({
      id: uuidv4(),
      menu_id: menuId,
      table_number: tableNumber || null,
      created_at: Date.now(),
      status: "pending",
    });

    const organizationSettings = await getOrganizationSettings(orgId);
    const menuSettings = menu.settings;

    const telegramToken = menuSettings.telegramBotToken || organizationSettings.telegramBotToken;
    const telegramChatId = menuSettings.telegramChatId || organizationSettings.telegramChatId;

    if (telegramToken && telegramChatId) {
      const message =
        `🔔 <b>Вызов официанта!</b>\n` +
        `📋 Меню: ${menu.name}\n` +
        `🪑 Стол: ${tableNumber || "не указан"}\n` +
        `⏰ ${new Date().toLocaleTimeString("ru-RU")}`;
      await sendTelegramNotification(message, telegramToken, telegramChatId);
    }

    return NextResponse.json(call, { status: 201 });
  } catch (error) {
    console.error("Failed to create waiter call:", error);
    return NextResponse.json({ error: "Failed to create waiter call" }, { status: 500 });
  }
}
