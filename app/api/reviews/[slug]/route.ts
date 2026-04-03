import { NextRequest, NextResponse } from "next/server";
import { createReview, getOrganizationBySlugForReview, sendTelegramNotification } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const org = await getOrganizationBySlugForReview(params.slug);

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: org.id,
      name: org.name,
      slug: org.slug,
      reviewRedirectUrl: org.reviewRedirectUrl,
      reviewStarThreshold: org.reviewStarThreshold,
    });
  } catch (error) {
    console.error("Failed to fetch organization:", error);
    return NextResponse.json({ error: "Failed to fetch organization" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const org = await getOrganizationBySlugForReview(params.slug);

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { rating, feedback, phone } = await request.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    const review = await createReview(org.id, rating, feedback || null, phone || null);

    const shouldRedirect = rating >= (org.reviewStarThreshold || 5);

    if (shouldRedirect && org.reviewRedirectUrl) {
      return NextResponse.json({
        success: true,
        redirect: org.reviewRedirectUrl,
        review,
      });
    }

    if (!shouldRedirect && org.telegramBotToken && org.telegramChatId) {
      let message = `⭐ Отрицательный отзыв!\n\n`;
      message += `Звезд: ${rating}/5\n`;
      if (feedback) message += `Комментарий: ${feedback}\n`;
      if (phone) message += `Телефон для связи: ${phone}`;
      
      await sendTelegramNotification(message, org.telegramBotToken, org.telegramChatId);
    }

    return NextResponse.json({
      success: true,
      redirect: null,
      review,
    });
  } catch (error) {
    console.error("Failed to submit review:", error);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
