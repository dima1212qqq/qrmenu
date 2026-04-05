import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  addUserToOrganization,
  createUser,
  getUserByEmail,
  getUserOrganization,
  getUserOrganizations,
  getUsersForOrganization,
} from "@/lib/db";
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

    const userOrgs = await getUserOrganizations(user.id);
    const userOrg = userOrgs.find((uo) => uo.organization.id === orgId);
    if (!userOrg || userOrg.role !== "owner") {
      return NextResponse.json({ error: "Only owners can view users" }, { status: 403 });
    }

    const users = await getUsersForOrganization(orgId);
    return NextResponse.json(users.map((item) => ({ ...item, password: undefined })));
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: "Only owners can add users" }, { status: 403 });
    }

    const { email, password, name } = await request.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedPassword = typeof password === "string" ? password : "";

    if (!normalizedEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const existingUser = await getUserByEmail(normalizedEmail);
    if (existingUser) {
      const existingMembership = await getUserOrganization(existingUser.id, orgId);
      if (existingMembership) {
        return NextResponse.json({ error: "User is already added to this organization" }, { status: 400 });
      }

      await addUserToOrganization(existingUser.id, orgId, "waiter");
      return NextResponse.json({ ...existingUser, password: undefined }, { status: 201 });
    }

    if (!normalizedName || !normalizedPassword) {
      return NextResponse.json(
        { error: "For a new user, name and password are required" },
        { status: 400 }
      );
    }

    const newUser = await createUser({
      id: uuidv4(),
      email: normalizedEmail,
      password: normalizedPassword,
      name: normalizedName,
      created_at: Date.now(),
    });

    await addUserToOrganization(newUser.id, orgId, "waiter");

    return NextResponse.json({ ...newUser, password: undefined }, { status: 201 });
  } catch (error) {
    console.error("Failed to create user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
