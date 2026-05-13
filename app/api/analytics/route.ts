import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, ...data } = body;

    if (!event) {
      return NextResponse.json({ error: "Event is required" }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const analyticsEntry = {
      timestamp,
      event,
      ...data,
    };

    console.log("[Analytics]", JSON.stringify(analyticsEntry));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
