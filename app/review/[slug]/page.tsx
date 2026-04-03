"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface ReviewData {
  id: string;
  name: string;
  slug: string;
  reviewRedirectUrl: string | null;
  reviewStarThreshold: number;
}

export default function ReviewPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPhoneInput, setShowPhoneInput] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/reviews/${slug}`);
        if (!res.ok) {
          throw new Error("Organization not found");
        }
        const reviewData = await res.json();
        setData(reviewData);
      } catch (err) {
        setError("Организация не найдена");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug]);

  const handleSubmit = useCallback(async () => {
    if (!rating) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/reviews/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, feedback, phone: phone || null }),
      });

      if (res.ok) {
        const result = await res.json();
        setSubmitted(true);

        if (result.redirect) {
          setTimeout(() => {
            window.location.href = result.redirect;
          }, 500);
        }
      }
    } catch (err) {
      console.error("Failed to submit review:", err);
    } finally {
      setSubmitting(false);
    }
  }, [slug, rating, feedback, phone]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Ошибка</h1>
          <p className="text-gray-500">{error || "Организация не найдена"}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❤️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Спасибо за обратную связь!</h1>
          <p className="text-gray-600 mb-4">
            Мы обязательно учтём ваши пожелания и улучшим качество нашего сервиса.
          </p>
          <p className="text-sm text-gray-500">
            Если вы оставили номер, мы свяжемся с вами при необходимости.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mt-8">
          <div className="text-center mb-8">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              Как вам {data.name}?
            </h1>
            <p className="text-gray-500">Оцените наше заведение</p>
          </div>

          <div className="flex justify-center gap-3 mb-8">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="text-5xl sm:text-6xl transition-transform hover:scale-110 focus:outline-none"
              >
                {star <= rating ? (
                  <span className="text-yellow-400">★</span>
                ) : (
                  <span className="text-gray-300">☆</span>
                )}
              </button>
            ))}
          </div>

          {rating > 0 && rating < (data.reviewStarThreshold || 5) && (
            <div className="space-y-4 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Что нам улучшить?
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Расскажите, что вам не понравилось..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                />
              </div>

              {!showPhoneInput ? (
                <button
                  type="button"
                  onClick={() => setShowPhoneInput(true)}
                  className="text-sm text-primary hover:text-primary/80"
                >
                  + Оставить номер телефона для обратной связи
                </button>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <Input
                    label="Номер телефона (опционально)"
                    placeholder="+7 (999) 123-45-67"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!rating || submitting}
            className="w-full"
            size="lg"
          >
            {submitting ? "Отправка..." : "Отправить"}
          </Button>
        </div>
      </div>
    </div>
  );
}
