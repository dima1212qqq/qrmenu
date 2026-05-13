import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const user = session.user as any;
    const userOrg = await prisma.userOrganization.findFirst({
      where: {
        userId: user.id,
        organizationId: order.organizationId,
      },
    });

    if (!userOrg || (userOrg.role !== "owner" && userOrg.role !== "waiter")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.order.update({
      where: { id },
      data: { status: "completed" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Complete order error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}