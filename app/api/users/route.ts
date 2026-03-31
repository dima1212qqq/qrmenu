import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createUser, getUserByEmail, getUsers } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;

    if (user.role !== "owner") {
      return NextResponse.json({ error: "Only owners can view users" }, { status: 403 });
    }

    const users = await getUsers(user.organization_id);
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

    if (user.role !== "owner") {
      return NextResponse.json({ error: "Only owners can add users" }, { status: 403 });
    }

    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, password and name are required" }, { status: 400 });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    const newUser = await createUser({
      id: uuidv4(),
      email,
      password,
      name,
      role: "waiter",
      organization_id: user.organization_id,
      created_at: Date.now(),
    });

    return NextResponse.json({ ...newUser, password: undefined }, { status: 201 });
  } catch (error) {
    console.error("Failed to create user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
