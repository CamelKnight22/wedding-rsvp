import QRCode from "qrcode";
import { nanoid } from "nanoid";
import sharp from "sharp";

// Generate unique QR code identifier
export function generateQRCode(): string {
  return `WED_${nanoid(12)}`;
}

// Generate QR code as data URL (for preview in browser)
export async function generateQRDataURL(
  code: string,
  baseUrl: string,
): Promise<string> {
  const url = `${baseUrl}/qr/${code}`;
  return QRCode.toDataURL(url, {
    width: 400,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

// Generate QR code as JPEG Buffer (for MMS - ClickSend doesn't support PNG)
export async function generateQRBuffer(
  code: string,
  baseUrl: string,
): Promise<{ buffer: Buffer; mimeType: string; extension: string }> {
  const url = `${baseUrl}/qr/${code}`;

  // Generate QR as PNG buffer first
  const pngBuffer = await QRCode.toBuffer(url, {
    width: 400,
    margin: 2,
    type: "png",
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });

  // Convert PNG to JPEG using sharp (ClickSend requires JPEG or GIF, not PNG)
  const jpegBuffer = await sharp(pngBuffer)
    .flatten({ background: "#ffffff" }) // Replace transparency with white
    .jpeg({ quality: 90 })
    .toBuffer();

  return {
    buffer: jpegBuffer,
    mimeType: "image/jpeg",
    extension: "jpg",
  };
}
