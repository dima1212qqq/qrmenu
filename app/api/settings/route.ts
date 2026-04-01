import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrganizationSettings, sendTelegramNotification, updateOrganizationSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const settings = await getOrganizationSettings(user.organization_id);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const updates = await request.json();

    const settings = await updateOrganizationSettings(user.organization_id, {
      telegramBotToken: updates.telegramBotToken || null,
      telegramChatId: updates.telegramChatId || null,
      soundEnabled: updates.soundEnabled ?? true,
      showWaiterButton: updates.showWaiterButton ?? true,
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message } = await request.json();
    const user = session.user as any;

    const settings = await getOrganizationSettings(user.organization_id);

    if (!settings.telegramBotToken || !settings.telegramChatId) {
      return NextResponse.json({ error: "Telegram not configured" }, { status: 400 });
    }

    const success = await sendTelegramNotification(
      message,
      settings.telegramBotToken,
      settings.telegramChatId
    );

    if (success) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Failed to send Telegram message" }, { status: 500 });
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
