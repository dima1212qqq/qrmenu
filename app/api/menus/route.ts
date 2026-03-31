import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createMenu, getMenus } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const menus = await getMenus(user.organization_id);
    return NextResponse.json(menus);
  } catch (error) {
    console.error("Failed to fetch menus:", error);
    return NextResponse.json({ error: "Failed to fetch menus" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const { name, description, logo } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const menu = await createMenu({
      id: uuidv4(),
      organization_id: user.organization_id,
      name,
      description: description || null,
      logo: logo || null,
      created_at: Date.now(),
      settings: {
        telegramBotToken: null,
        telegramChatId: null,
        soundEnabled: true,
      },
    });

    return NextResponse.json(menu, { status: 201 });
  } catch (error) {
    console.error("Failed to create menu:", error);
    return NextResponse.json({ error: "Failed to create menu" }, { status: 500 });
  }
}
