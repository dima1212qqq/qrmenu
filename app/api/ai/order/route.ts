import { NextRequest, NextResponse } from "next/server";
import { getMenu } from "@/lib/db";
import { prisma } from "@/lib/prisma";

interface OrderItem {
  dishId: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderRequest {
  menuId: string;
  tableNumber?: string | null;
  items: OrderItem[];
}

export async function POST(request: NextRequest) {
  try {
    const body: OrderRequest = await request.json();
    const { menuId, tableNumber, items } = body;

    if (!menuId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const menu = await getMenu(menuId);
    if (!menu) {
      return NextResponse.json({ error: "Menu not found" }, { status: 404 });
    }

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const order = await prisma.order.create({
      data: {
        menuId,
        organizationId: menu.organization_id,
        tableNumber: tableNumber || null,
        total,
        status: "pending",
        createdAt: BigInt(Date.now()),
        items: {
          create: items.map((item) => ({
            dishId: item.dishId,
            dishName: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      total: order.total,
      status: order.status,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
