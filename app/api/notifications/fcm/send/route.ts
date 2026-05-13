import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const FIREBASE_API_URL = "https://fcm.googleapis.com/fcm/send";

interface FCMMessage {
  to?: string;
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
}

async function sendFCMNotification(fcmToken: string, title: string, body: string, data?: Record<string, string>) {
  const response = await fetch(FIREBASE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `key=${process.env.FIREBASE_SERVER_KEY}`,
    },
    body: JSON.stringify({
      to: fcmToken,
      notification: { title, body },
      data,
    } as FCMMessage),
  });

  if (!response.ok) {
    throw new Error(`FCM send failed: ${response.statusText}`);
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const { organizationId, type, title, body, data } = await request.json();

    if (!organizationId || !type) {
      return NextResponse.json(
        { error: "organizationId and type are required" },
        { status: 400 }
      );
    }

    const userOrg = await prisma.userOrganization.findFirst({
      where: {
        userId: user.id,
        organizationId,
      },
    });

    if (!userOrg || (userOrg.role !== "owner" && userOrg.role !== "waiter")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        organizationId,
        userId: { not: user.id },
      },
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: "No subscribers" });
    }

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        sendFCMNotification(
          sub.fcmToken,
          title || getDefaultTitle(type),
          body || getDefaultBody(type, data),
          { type, ...data }
        )
      )
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      success: true,
      sent: succeeded,
      failed,
    });
  } catch (error) {
    console.error("FCM send error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function getDefaultTitle(type: string): string {
  switch (type) {
    case "call":
      return "🔔 Новый вызов официанта!";
    case "order":
      return "📦 Новый заказ!";
    default:
      return "📢 Уведомление";
  }
}

function getDefaultBody(type: string, data?: Record<string, string>): string {
  switch (type) {
    case "call":
      return `Стол: ${data?.tableNumber || "не указан"}`;
    case "order":
      return `Заказ на сумму ${data?.total || 0}₽`;
    default:
      return "Проверьте приложение";
  }
}