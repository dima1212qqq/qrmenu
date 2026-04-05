import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrganizationSettings, getUserOrganization, sendTelegramNotification, updateOrganizationSettings } from "@/lib/db";

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
    if (!userOrg || userOrg.role !== "owner") {
      return NextResponse.json({ error: "Only owners can view settings" }, { status: 403 });
    }

    const settings = await getOrganizationSettings(orgId);
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
    const orgId = request.headers.get("x-organization-id");
    if (!orgId) {
      return NextResponse.json({ error: "x-organization-id header is required" }, { status: 400 });
    }

    const userOrg = await getUserOrganization(user.id, orgId);
    if (!userOrg || userOrg.role !== "owner") {
      return NextResponse.json({ error: "Only owners can update settings" }, { status: 403 });
    }

    const updates = await request.json();

    const settings = await updateOrganizationSettings(orgId, {
      telegramBotToken: updates.telegramBotToken || null,
      telegramChatId: updates.telegramChatId || null,
      soundEnabled: updates.soundEnabled ?? true,
      showWaiterButton: updates.showWaiterButton ?? true,
      reviewRedirectUrl: updates.reviewRedirectUrl || null,
      reviewStarThreshold: updates.reviewStarThreshold ?? 5,
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

    const user = session.user as any;
    const { message } = await request.json();
    const orgId = request.headers.get("x-organization-id");
    if (!orgId) {
      return NextResponse.json({ error: "x-organization-id header is required" }, { status: 400 });
    }

    const userOrg = await getUserOrganization(user.id, orgId);
    if (!userOrg || userOrg.role !== "owner") {
      return NextResponse.json({ error: "Only owners can test notifications" }, { status: 403 });
    }

    const settings = await getOrganizationSettings(orgId);

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
