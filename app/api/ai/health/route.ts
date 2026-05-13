import { NextResponse } from "next/server";
import { getChatProvider } from "@/lib/llm";

export async function GET() {
  const provider = getChatProvider();
  const status = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      llm: {
        provider: provider.name,
        status: "unknown" as string,
      },
    },
  };

  try {
    // Lightweight health check — list available models if supported
    await provider.chatCompletion({
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1,
    });
    status.services.llm.status = "ok";
  } catch {
    status.services.llm.status = "error";
  }

  return NextResponse.json(status);
}
