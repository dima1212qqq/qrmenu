import { NextRequest, NextResponse } from "next/server";
import { createOrganization, createUser, generateUniqueSlug, getUserByEmail } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, organizationName } = await request.json();

    if (!name || !email || !password || !organizationName) {
      return NextResponse.json(
        { error: "Р’СЃРµ РїРѕР»СЏ РѕР±СЏР·Р°С‚РµР»СЊРЅС‹" },
        { status: 400 }
      );
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ СЃ С‚Р°РєРёРј email СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚" },
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
      role: "owner",
      organization_id: orgId,
      created_at: Date.now(),
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organization_id: user.organization_id,
      organization: org,
    }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "РћС€РёР±РєР° РїСЂРё СЂРµРіРёСЃС‚СЂР°С†РёРё" },
      { status: 500 }
    );
  }
}
