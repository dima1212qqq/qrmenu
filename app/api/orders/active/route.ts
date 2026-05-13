import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const orgId = request.headers.get("x-organization-id");

    if (!orgId) {
      return NextResponse.json(
        { error: "x-organization-id header is required" },
        { status: 400 }
      );
    }

    const userOrg = await prisma.userOrganization.findFirst({
      where: {
        userId: user.id,
        organizationId: orgId,
      },
    });

    if (!userOrg || (userOrg.role !== "owner" && userOrg.role !== "waiter")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orders = await prisma.order.findMany({
      where: {
        organizationId: orgId,
        status: "pending",
      },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedOrders = orders.map((order) => ({
      id: order.id,
      menuId: order.menuId,
      organizationId: order.organizationId,
      tableNumber: order.tableNumber,
      total: order.total,
      status: order.status,
      createdAt: Number(order.createdAt),
      items: order.items.map((item) => ({
        id: item.id,
        dishId: item.dishId,
        dishName: item.dishName,
        price: item.price,
        quantity: item.quantity,
      })),
    }));

    return NextResponse.json(formattedOrders);
  } catch (error) {
    console.error("Fetch active orders error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}