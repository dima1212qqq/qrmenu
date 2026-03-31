import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDishCategoriesForOrganization } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const dishCategories = await getDishCategoriesForOrganization(user.organization_id);
    return NextResponse.json(dishCategories);
  } catch (error) {
    console.error("Failed to fetch dish categories:", error);
    return NextResponse.json({ error: "Failed to fetch dish categories" }, { status: 500 });
  }
}
