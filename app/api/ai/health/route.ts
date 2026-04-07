import { NextResponse } from "next/server";
import { openai } from "@/lib/embeddings";

export async function GET() {
  const status = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      openai: "unknown",
    },
  };

  try {
    await openai.models.list();
    status.services.openai = "ok";
  } catch {
    status.services.openai = "error";
  }

  return NextResponse.json(status);
}
