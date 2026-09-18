import sharp from "sharp";
import { logger } from "./logger";

type WatermarkPosition = "bottom_right" | "bottom_left" | "top_right" | "top_left" | "centered_bottom";

interface WatermarkOptions {
  imageBase64: string;
  logoBase64: string;
  businessName?: string | null;
  position?: string | null;
  showName?: boolean | null;
}

const PADDING = 32;
const MAX_LOGO_RATIO = 0.18;
const NAME_FONT_SIZE = 15;
const NAME_OFFSET = 8;

function parseBase64(data: string): Buffer {
  const clean = data.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(clean, "base64");
}

function svgTextWatermark(name: string, width: number): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${NAME_FONT_SIZE + 8}">
    <style>text { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: ${NAME_FONT_SIZE}px; fill: white; }</style>
    <text x="${width / 2}" y="${NAME_FONT_SIZE}" text-anchor="middle" filter="url(#shadow)">${escapeXml(name)}</text>
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="black" flood-opacity="0.8"/>
      </filter>
    </defs>
  </svg>`;
  return Buffer.from(svg);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getCompositePosition(
  position: WatermarkPosition,
  canvasW: number,
  canvasH: number,
  logoW: number,
  logoH: number,
  nameH: number
): { left: number; top: number } {
  const totalH = logoH + (nameH > 0 ? NAME_OFFSET + nameH : 0);

  switch (position) {
    case "top_left":
      return { left: PADDING, top: PADDING };
    case "top_right":
      return { left: canvasW - logoW - PADDING, top: PADDING };
    case "bottom_left":
      return { left: PADDING, top: canvasH - totalH - PADDING };
    case "centered_bottom":
      return { left: Math.round((canvasW - logoW) / 2), top: canvasH - totalH - PADDING };
    case "bottom_right":
    default:
      return { left: canvasW - logoW - PADDING, top: canvasH - totalH - PADDING };
  }
}

export async function applyWatermark(opts: WatermarkOptions): Promise<string> {
  try {
    const position = (opts.position ?? "bottom_right") as WatermarkPosition;
    const showName = opts.showName ?? true;
    const businessName = opts.businessName ?? "";

    const imageBuffer = parseBase64(opts.imageBase64);
    const logoBuffer = parseBase64(opts.logoBase64);

    const imageMeta = await sharp(imageBuffer).metadata();
    const canvasW = imageMeta.width ?? 1080;
    const canvasH = imageMeta.height ?? 1080;

    const maxLogoW = Math.round(canvasW * MAX_LOGO_RATIO);
    const logoMeta = await sharp(logoBuffer).metadata();
    const origW = logoMeta.width ?? 200;
    const origH = logoMeta.height ?? 200;

    const logoW = Math.min(origW, maxLogoW);
    const logoH = Math.round((origH / origW) * logoW);

    const resizedLogo = await sharp(logoBuffer)
      .resize(logoW, logoH, { fit: "inside" })
      .composite([{
        input: Buffer.from([0, 0, 0, Math.round(0.85 * 255)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: "dest-in",
      }])
      .toBuffer()
      .catch(() =>
        sharp(logoBuffer).resize(logoW, logoH, { fit: "inside" }).toBuffer()
      );

    const nameH = showName && businessName ? NAME_FONT_SIZE + 8 : 0;
    const { left, top } = getCompositePosition(position, canvasW, canvasH, logoW, logoH, nameH);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const composites: any[] = [
      {
        input: resizedLogo,
        left,
        top,
        blend: "over",
      },
    ];

    if (showName && businessName) {
      const nameSvg = svgTextWatermark(businessName, logoW);
      const nameImg = await sharp(nameSvg).png().toBuffer();
      composites.push({
        input: nameImg,
        left,
        top: top + logoH + NAME_OFFSET,
        blend: "over",
      });
    }

    const composited = await sharp(imageBuffer)
      .composite(composites)
      .webp({ quality: 90 })
      .toBuffer();

    return `data:image/webp;base64,${composited.toString("base64")}`;
  } catch (err) {
    logger.error({ err }, "Watermark compositing failed — returning original image");
    return opts.imageBase64;
  }
}
