import QRCode from "qrcode";

export async function generateQRCode(url: string): Promise<string> {
  try {
    return await QRCode.toDataURL(url, {
      width: 200,
      margin: 2,
      color: {
        dark: "#1F2937",
        light: "#FFFFFF",
      },
    });
  } catch (err) {
    console.error("Failed to generate QR code:", err);
    return "";
  }
}

export async function downloadQRCode(url: string, filename: string): Promise<void> {
  try {
    const dataUrl = await QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: {
        dark: "#1F2937",
        light: "#FFFFFF",
      },
    });
    
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Failed to download QR code:", err);
  }
}

export function getMenuUrl(menuId: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/menu/${menuId}`;
}
