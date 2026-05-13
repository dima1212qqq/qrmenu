import { NextRequest, NextResponse } from "next/server";
import { getOrganizationBySlug } from "@/lib/db";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, orgSlug, sessionId, dishId, dishName } = body;

    if (!event) {
      return NextResponse.json({ error: "Missing event type" }, { status: 400 });
    }

    if (!orgSlug) {
      return NextResponse.json({ error: "Missing orgSlug" }, { status: 400 });
    }

    const organization = await getOrganizationBySlug(orgSlug);
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    if (event === "dish_added_from_chat") {
      await prisma.aiChatLog.create({
        data: {
          organizationId: organization.id,
          sessionId: sessionId || null,
          userMessage: "",
          aiResponsText: null,
          recommendedDishIds: dishId || null,
          addedToCartDishIds: dishId || null,
          createdAt: BigInt(Date.now()),
        },
      });
    } else if (event === "chat_opened" || event === "quick_action_used" || event === "suggested_action_used") {
      console.log(`[Analytics] ${event}: org=${orgSlug} session=${sessionId || "unknown"}`);
    }

    return NextResponse.json({ logged: true });
  } catch (error) {
    console.error("[Analytics] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
