import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  addUserToOrganization,
  createOrganization,
  generateUniqueSlug,
  getUserOrganizations,
} from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const userOrganizations = await getUserOrganizations(user.id);
    const canCreateOrganization = userOrganizations.some((organization) => organization.role === "owner");

    if (!canCreateOrganization) {
      return NextResponse.json({ error: "Only owners can create organizations" }, { status: 403 });
    }

    const { name } = await request.json();
    const organizationName = typeof name === "string" ? name.trim() : "";

    if (!organizationName) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }

    const slug = await generateUniqueSlug(organizationName);
    const organizationId = uuidv4();

    const organization = await createOrganization({
      id: organizationId,
      name: organizationName,
      slug,
      created_at: Date.now(),
      settings: {
        telegramBotToken: null,
        telegramChatId: null,
        soundEnabled: true,
      },
    });

    await addUserToOrganization(user.id, organizationId, "owner");

    return NextResponse.json(
      {
        organization,
        role: "owner",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create organization:", error);
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
  }
}
