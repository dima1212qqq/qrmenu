import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDishCategoriesForOrganization, getUserOrganization } from "@/lib/db";

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
    if (!userOrg) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const dishCategories = await getDishCategoriesForOrganization(orgId);
    return NextResponse.json(dishCategories);
  } catch (error) {
    console.error("Failed to fetch dish categories:", error);
    return NextResponse.json({ error: "Failed to fetch dish categories" }, { status: 500 });
  }
}
