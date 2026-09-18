import { db, channelSettingsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import {
  encryptChannelCredential,
  isEncryptedChannelCredential,
  validateChannelCredentialEncryptionConfiguration,
} from "./channelCredentials";

export interface ChannelCredentialBackfillResult {
  scannedRows: number;
  migratedCredentials: number;
  skippedBecauseTableMissing: boolean;
}

export async function backfillChannelCredentials(): Promise<ChannelCredentialBackfillResult> {
  validateChannelCredentialEncryptionConfiguration();

  let rows;
  try {
    rows = await db
      .select({
        userId: channelSettingsTable.userId,
        smsAuthToken: channelSettingsTable.smsAuthToken,
        emailSendgridApiKey: channelSettingsTable.emailSendgridApiKey,
      })
      .from(channelSettingsTable);
  } catch (error) {
    if (getDatabaseErrorCode(error) === "42P01") {
      return {
        scannedRows: 0,
        migratedCredentials: 0,
        skippedBecauseTableMissing: true,
      };
    }
    throw error;
  }

  let migratedCredentials = 0;

  for (const row of rows) {
    if (row.smsAuthToken && !isEncryptedChannelCredential(row.smsAuthToken)) {
      const result = await db
        .update(channelSettingsTable)
        .set({
          smsAuthToken: encryptChannelCredential(row.smsAuthToken),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(channelSettingsTable.userId, row.userId),
            eq(channelSettingsTable.smsAuthToken, row.smsAuthToken),
          ),
        )
        .returning({ id: channelSettingsTable.id });
      migratedCredentials += result.length;
    }

    if (
      row.emailSendgridApiKey &&
      !isEncryptedChannelCredential(row.emailSendgridApiKey)
    ) {
      const result = await db
        .update(channelSettingsTable)
        .set({
          emailSendgridApiKey: encryptChannelCredential(
            row.emailSendgridApiKey,
          ),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(channelSettingsTable.userId, row.userId),
            eq(
              channelSettingsTable.emailSendgridApiKey,
              row.emailSendgridApiKey,
            ),
          ),
        )
        .returning({ id: channelSettingsTable.id });
      migratedCredentials += result.length;
    }
  }

  return {
    scannedRows: rows.length,
    migratedCredentials,
    skippedBecauseTableMissing: false,
  };
}

function getDatabaseErrorCode(error: unknown): string | undefined {
  let currentError: unknown = error;

  while (currentError && typeof currentError === "object") {
    if (
      "code" in currentError &&
      typeof currentError.code === "string"
    ) {
      return currentError.code;
    }
    currentError =
      "cause" in currentError ? currentError.cause : undefined;
  }

  return undefined;
}