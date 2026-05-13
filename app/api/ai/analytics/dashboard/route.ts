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
      return NextResponse.json({ error: "Missing organization" }, { status: 400 });
    }

    // Verify user belongs to this org
    const userOrg = await prisma.userOrganization.findFirst({
      where: { userId: user.id, organizationId: orgId },
    });
    if (!userOrg) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get("days") || "30");
    const from = BigInt(Date.now() - days * 24 * 60 * 60 * 1000);

    // Run all queries in parallel
    const [
      aiOrders,
      menuOrders,
      chatLogs,
      dishAddedLogs,
      chatSessions,
    ] = await Promise.all([
      // AI orders
      prisma.order.findMany({
        where: { organizationId: orgId, source: "ai_chat", createdAt: { gte: from } },
        select: { total: true, createdAt: true },
      }),
      // Menu orders
      prisma.order.findMany({
        where: { organizationId: orgId, source: "qr_menu", createdAt: { gte: from } },
        select: { total: true, createdAt: true },
      }),
      // Chat logs with messages (for top queries and not-found)
      prisma.aiChatLog.findMany({
        where: {
          organizationId: orgId,
          createdAt: { gte: from },
          userMessage: { not: "" },
        },
        select: {
          userMessage: true,
          recommendedDishIds: true,
          searchResultsCount: true,
          createdAt: true,
        },
      }),
      // Dish added from chat logs
      prisma.aiChatLog.findMany({
        where: {
          organizationId: orgId,
          addedToCartDishIds: { not: null },
          createdAt: { gte: from },
        },
        select: { addedToCartDishIds: true },
      }),
      // Unique chat sessions
      prisma.aiChatLog.findMany({
        where: {
          organizationId: orgId,
          createdAt: { gte: from },
          sessionId: { not: null },
        },
        select: { sessionId: true },
        distinct: ["sessionId"],
      }),
    ]);

    // Compute metrics
    const aiRevenue = aiOrders.reduce((sum, o) => sum + o.total, 0);
    const menuRevenue = menuOrders.reduce((sum, o) => sum + o.total, 0);
    const aiAOV = aiOrders.length > 0 ? aiRevenue / aiOrders.length : 0;
    const menuAOV = menuOrders.length > 0 ? menuRevenue / menuOrders.length : 0;
    const uniqueSessions = chatSessions.length;

    // AI Conversion: AI orders / unique chat sessions
    // We need to count unique sessions that ended with an order
    // Since aiSessionId is on orders, count unique aiSessionId in aiOrders
    const aiOrderSessionIds = new Set(
      (await prisma.order.findMany({
        where: { organizationId: orgId, source: "ai_chat", createdAt: { gte: from }, aiSessionId: { not: null } },
        select: { aiSessionId: true },
        distinct: ["aiSessionId"],
      })).map((o) => o.aiSessionId)
    );
    const aiConversion = uniqueSessions > 0 ? (aiOrderSessionIds.size / uniqueSessions) * 100 : 0;

    // AI Attach Rate: chat sessions / total orders (as proxy for total visitors)
    const totalOrders = aiOrders.length + menuOrders.length;
    const aiAttachRate = totalOrders > 0 ? (uniqueSessions / totalOrders) * 100 : 0;

    // Revenue by day for chart
    const revenueByDay = computeRevenueByDay(aiOrders, menuOrders, days);

    // Top recommended dishes
    const dishIdCounts: Record<string, number> = {};
    for (const log of chatLogs) {
      if (log.recommendedDishIds) {
        for (const id of log.recommendedDishIds.split(",")) {
          const trimmed = id.trim();
          if (trimmed) dishIdCounts[trimmed] = (dishIdCounts[trimmed] || 0) + 1;
        }
      }
    }
    // Also count added-to-cart dishes
    const addedDishCounts: Record<string, number> = {};
    for (const log of dishAddedLogs) {
      if (log.addedToCartDishIds) {
        for (const id of log.addedToCartDishIds.split(",")) {
          const trimmed = id.trim();
          if (trimmed) {
            addedDishCounts[trimmed] = (addedDishCounts[trimmed] || 0) + 1;
          }
        }
      }
    }

    const topRecommendedIds = Object.entries(dishIdCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id]) => id);

    // Fetch dish names for top recommended
    let topRecommended: { id: string; name: string; count: number; addedToCart: number }[] = [];
    if (topRecommendedIds.length > 0) {
      const dishes = await prisma.dish.findMany({
        where: { id: { in: topRecommendedIds } },
        select: { id: true, name: true },
      });
      const dishNameMap = Object.fromEntries(dishes.map((d) => [d.id, d.name]));
      topRecommended = topRecommendedIds.map((id) => ({
        id,
        name: dishNameMap[id] || "Неизвестно",
        count: dishIdCounts[id] || 0,
        addedToCart: addedDishCounts[id] || 0,
      }));
    }

    // Top "not found" queries
    const notFoundLogs = chatLogs.filter((l) => l.searchResultsCount === 0);
    const queryCounts: Record<string, number> = {};
    for (const log of notFoundLogs) {
      const msg = log.userMessage.trim().toLowerCase();
      if (msg) queryCounts[msg] = (queryCounts[msg] || 0) + 1;
    }
    const topNotFound = Object.entries(queryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    return NextResponse.json({
      period: { days, from: Number(from), to: Date.now() },
      summary: {
        aiOrders: aiOrders.length,
        menuOrders: menuOrders.length,
        aiRevenue: Math.round(aiRevenue * 100) / 100,
        menuRevenue: Math.round(menuRevenue * 100) / 100,
        aiAOV: Math.round(aiAOV * 100) / 100,
        menuAOV: Math.round(menuAOV * 100) / 100,
        aiConversion: Math.round(aiConversion * 10) / 10,
        aiAttachRate: Math.round(aiAttachRate * 10) / 10,
        chatSessions: uniqueSessions,
        revenueLift: Math.round((aiRevenue - menuRevenue) * 100) / 100,
      },
      revenueByDay,
      topRecommended,
      topNotFound,
    });
  } catch (error) {
    console.error("[Analytics Dashboard] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function computeRevenueByDay(
  aiOrders: { total: number; createdAt: bigint }[],
  menuOrders: { total: number; createdAt: bigint }[],
  _days: number
): { date: string; aiRevenue: number; menuRevenue: number }[] {
  const dayMap: Record<string, { ai: number; menu: number }> = {};

  for (const o of aiOrders) {
    const d = new Date(Number(o.createdAt));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!dayMap[key]) dayMap[key] = { ai: 0, menu: 0 };
    dayMap[key].ai += o.total;
  }
  for (const o of menuOrders) {
    const d = new Date(Number(o.createdAt));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!dayMap[key]) dayMap[key] = { ai: 0, menu: 0 };
    dayMap[key].menu += o.total;
  }

  return Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      aiRevenue: Math.round(v.ai * 100) / 100,
      menuRevenue: Math.round(v.menu * 100) / 100,
    }));
}
