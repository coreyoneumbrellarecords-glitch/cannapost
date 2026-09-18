import app from "./app";
import { logger } from "./lib/logger";
import { IMAGE_MODEL, validateOpenRouterConnection } from "./lib/imageGenerator";
import { backfillChannelCredentials } from "./lib/channelCredentialBackfill";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

logger.info({ imageModel: IMAGE_MODEL }, "Image generation model configured");

async function startServer(): Promise<void> {
  await validateOpenRouterConnection();
  const backfill = await backfillChannelCredentials();
  logger.info(backfill, "Channel credential encryption backfill completed");

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

startServer().catch((error) => {
  logger.fatal({ err: error }, "API server startup failed");
  process.exit(1);
});
