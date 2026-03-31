import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteUser, getUser } from "@/lib/db";

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

    if (user.role !== "owner") {
      return NextResponse.json({ error: "Only owners can delete users" }, { status: 403 });
    }

    const userToDelete = await getUser(params.id);
    if (!userToDelete) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (userToDelete.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (userToDelete.role === "owner") {
      return NextResponse.json({ error: "Cannot delete owner" }, { status: 400 });
    }

    await deleteUser(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
