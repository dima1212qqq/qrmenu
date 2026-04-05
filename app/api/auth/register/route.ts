import { NextRequest, NextResponse } from "next/server";
import { addUserToOrganization, createOrganization, createUser, generateUniqueSlug, getUserByEmail } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, organizationName } = await request.json();

    if (!name || !email || !password || !organizationName) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: "Пользователь с таким EMAIL уже существует" },
        { status: 400 }
      );
    }

    const slug = await generateUniqueSlug(organizationName);

    const orgId = uuidv4();
    const org = await createOrganization({
      id: orgId,
      name: organizationName,
      slug,
      created_at: Date.now(),
      settings: {
        telegramBotToken: null,
        telegramChatId: null,
        soundEnabled: true,
      },
    });

    const userId = uuidv4();
    const user = await createUser({
      id: userId,
      email,
      password,
      name,
      created_at: Date.now(),
    });

    await addUserToOrganization(userId, orgId, "owner");

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      organization: org,
    }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration error" },
      { status: 500 }
    );
  }
}
