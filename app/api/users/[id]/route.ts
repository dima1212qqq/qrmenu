import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteUser, getUser, getUserOrganizations } from "@/lib/db";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const userOrgs = await getUserOrganizations(user.id);
    const userOrg = userOrgs.find((uo) => uo.organization.id === orgId);
    if (!userOrg || userOrg.role !== "owner") {
      return NextResponse.json({ error: "Only owners can delete users" }, { status: 403 });
    }

    const userToDelete = await getUser(params.id);
    if (!userToDelete) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userToDeleteOrgs = await getUserOrganizations(params.id);
    const userToDeleteOrg = userToDeleteOrgs.find((uo) => uo.organization.id === orgId);
    if (!userToDeleteOrg || userToDeleteOrg.role === "owner") {
      return NextResponse.json({ error: "Cannot delete owner or user not in organization" }, { status: 400 });
    }

    await (prisma as any).userOrganization.deleteMany({
      where: { userId: params.id, organizationId: orgId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
