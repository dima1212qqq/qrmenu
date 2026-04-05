import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createTag, getTags, getUserOrganization } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

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

    const tags = await getTags(orgId);

    return NextResponse.json(tags);
  } catch (error) {
    console.error("Failed to fetch tags:", error);
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = request.headers.get("x-organization-id");
    if (!orgId) {
      return NextResponse.json({ error: "x-organization-id header is required" }, { status: 400 });
    }

    const user = session.user as any;
    const userOrg = await getUserOrganization(user.id, orgId);
    if (!userOrg || userOrg.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, emoji } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const tag = await createTag({
      id: uuidv4(),
      name: name.trim(),
      emoji: emoji?.trim() || "⭐",
      organization_id: orgId,
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error("Failed to create tag:", error);
    return NextResponse.json({ error: "Failed to create tag" }, { status: 500 });
  }
}
