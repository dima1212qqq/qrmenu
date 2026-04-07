import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { copyMenu, getMenu, getUserOrganization } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const { sourceMenuId, targetOrgId, newName } = await request.json();

    if (!sourceMenuId) {
      return NextResponse.json({ error: "sourceMenuId is required" }, { status: 400 });
    }

    if (!targetOrgId) {
      return NextResponse.json({ error: "targetOrgId is required" }, { status: 400 });
    }

    const sourceMenu = await getMenu(sourceMenuId);
    if (!sourceMenu) {
      return NextResponse.json({ error: "Source menu not found" }, { status: 404 });
    }

    const sourceUserOrg = await getUserOrganization(user.id, sourceMenu.organization_id);
    if (!sourceUserOrg || sourceUserOrg.role !== "owner") {
      return NextResponse.json({ error: "Only owners can copy menus" }, { status: 403 });
    }

    const targetUserOrg = await getUserOrganization(user.id, targetOrgId);
    if (!targetUserOrg || targetUserOrg.role !== "owner") {
      return NextResponse.json({ error: "Only owners can copy menus to their organizations" }, { status: 403 });
    }

    const copiedMenu = await copyMenu(sourceMenuId, targetOrgId, newName);

    return NextResponse.json(copiedMenu, { status: 201 });
  } catch (error) {
    console.error("Failed to copy menu:", error);
    return NextResponse.json({ error: "Failed to copy menu" }, { status: 500 });
  }
}