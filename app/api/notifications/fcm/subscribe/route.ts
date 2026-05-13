import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const { fcmToken, organizationId, deviceName } = await request.json();

    if (!fcmToken || !organizationId) {
      return NextResponse.json(
        { error: "fcmToken and organizationId are required" },
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

    await prisma.pushSubscription.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId,
        },
      },
      update: {
        fcmToken,
        deviceName: deviceName || null,
        updatedAt: BigInt(Date.now()),
      },
      create: {
        userId: user.id,
        organizationId,
        fcmToken,
        deviceName: deviceName || null,
        createdAt: BigInt(Date.now()),
        updatedAt: BigInt(Date.now()),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("FCM subscribe error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      );
    }

    await prisma.pushSubscription.deleteMany({
      where: {
        userId: user.id,
        organizationId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("FCM unsubscribe error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}