import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserOrganizations } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const userOrgs = await getUserOrganizations(user.id);

    if (!userOrgs || userOrgs.length === 0) {
      return NextResponse.json({ error: "No organizations found" }, { status: 404 });
    }

    return NextResponse.json(userOrgs);
  } catch (error) {
    console.error("Failed to fetch organizations:", error);
    return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 });
  }
}
