"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { generateQRCode, downloadQRCode } from "@/lib/qr";

interface ReviewQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgSlug: string;
  orgName: string;
}

export function ReviewQRModal({ isOpen, onClose, orgSlug, orgName }: ReviewQRModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [reviewUrl, setReviewUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && orgSlug) {
      const url = getReviewUrl(orgSlug);
      setReviewUrl(url);
      setLoading(true);
      generateQRCode(url).then((dataUrl) => {
        setQrCodeUrl(dataUrl);
        setLoading(false);
      });
    }
  }, [isOpen, orgSlug]);

  const handleDownload = () => {
    if (reviewUrl) {
      downloadQRCode(reviewUrl, `qr-review-${orgName.toLowerCase().replace(/\s+/g, "-")}.png`);
    }
  };

  const handleCopy = async () => {
    if (!reviewUrl) return;
    
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(reviewUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = reviewUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="QR Код для отзывов"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
          <Button onClick={handleDownload} disabled={loading}>
            Скачать PNG
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          {loading ? (
            <div className="w-[200px] h-[200px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : qrCodeUrl ? (
            <img src={qrCodeUrl} alt="QR Code" className="w-[200px] h-[200px]" />
          ) : (
            <div className="w-[200px] h-[200px] flex items-center justify-center text-gray-400">
              Не удалось сгенерировать
            </div>
          )}
        </div>

        <div className="w-full">
          <p className="text-sm text-gray-500 text-center mb-2">Ссылка на страницу отзывов:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={reviewUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-600 truncate"
            />
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              {copied ? "Скопировано!" : "Копировать"}
            </Button>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Разместите QR-код на столике. Гости смогут оставить отзыв и оценку.
        </p>
      </div>
    </Modal>
  );
}

function getReviewUrl(orgSlug: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/review/${orgSlug}`;
}
