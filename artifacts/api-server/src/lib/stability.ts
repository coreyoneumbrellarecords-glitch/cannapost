import { logger } from "./logger";

const NEGATIVE_PROMPT =
  "blurry, low quality, pixelated, watermark, text overlay, generic stock photo, " +
  "oversaturated, washed out, ugly, deformed, amateur, boring, flat lighting, " +
  "plain background with no detail, clipart, cartoon, overexposed, underexposed, " +
  "out of focus, grainy, noisy, distorted, unrealistic, fake-looking, poorly composed, " +
  "cropped badly, duplicate subjects, extra limbs, bad anatomy, low resolution";

export async function generateImage(prompt: string, postType: "post" | "story"): Promise<string | null> {
  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) {
    logger.warn("STABILITY_API_KEY not set — skipping image generation");
    return null;
  }

  try {
    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("negative_prompt", NEGATIVE_PROMPT);
    formData.append("output_format", "webp");
    formData.append("aspect_ratio", postType === "story" ? "9:16" : "1:1");

    const response = await fetch(
      "https://api.stability.ai/v2beta/stable-image/generate/core",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "image/*",
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const err = await response.text();
      logger.error({ err, status: response.status }, "Stability AI text-to-image error");
      return null;
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:image/webp;base64,${base64}`;
  } catch (err) {
    logger.error({ err }, "Failed to generate image");
    return null;
  }
}

export async function generateImageFromReference(
  prompt: string,
  referenceImageBase64: string,
  postType: "post" | "story",
  strength = 0.6
): Promise<string | null> {
  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) {
    logger.warn("STABILITY_API_KEY not set — skipping image generation");
    return null;
  }

  try {
    // Decode base64 to a buffer and create a Blob for multipart upload
    const base64Data = referenceImageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");
    const imageBlob = new Blob([imageBuffer], { type: "image/png" });

    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("negative_prompt", NEGATIVE_PROMPT);
    formData.append("image", imageBlob, "reference.png");
    formData.append("strength", String(strength));
    formData.append("output_format", "webp");
    formData.append("mode", "image-to-image");

    const response = await fetch(
      "https://api.stability.ai/v2beta/stable-image/generate/sd3",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "image/*",
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const err = await response.text();
      logger.error({ err, status: response.status }, "Stability AI image-to-image error");
      // Fall back to text-to-image if img2img fails
      logger.info("Falling back to text-to-image generation");
      return generateImage(prompt, postType);
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:image/webp;base64,${base64}`;
  } catch (err) {
    logger.error({ err }, "Failed to generate image from reference");
    return generateImage(prompt, postType);
  }
}
