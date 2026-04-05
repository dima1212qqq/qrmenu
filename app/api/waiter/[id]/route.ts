import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteWaiterCall, getMenu, getUserOrganization, getWaiterCall, updateWaiterCall } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
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

    const userOrg = await getUserOrganization(user.id, orgId);
    if (!userOrg) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { status } = await request.json();

    if (!status || !["pending", "completed"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const existingCall = await getWaiterCall(params.id);
    if (!existingCall) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const menu = await getMenu(existingCall.menu_id);
    if (!menu || menu.organization_id !== orgId) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const call = await updateWaiterCall(params.id, { status });
    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    return NextResponse.json(call);
  } catch (error) {
    console.error("Failed to update waiter call:", error);
    return NextResponse.json({ error: "Failed to update waiter call" }, { status: 500 });
  }
}

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

    const userOrg = await getUserOrganization(user.id, orgId);
    if (!userOrg) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingCall = await getWaiterCall(params.id);
    if (!existingCall) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const menu = await getMenu(existingCall.menu_id);
    if (!menu || menu.organization_id !== orgId) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    await deleteWaiterCall(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete waiter call:", error);
    return NextResponse.json({ error: "Failed to delete waiter call" }, { status: 500 });
  }
}
