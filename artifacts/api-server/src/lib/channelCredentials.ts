import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const CREDENTIAL_CIPHER_VERSION = "v1";
const CREDENTIAL_ALGORITHM = "aes-256-gcm";
const CREDENTIAL_IV_LENGTH = 12;

export function isEncryptedChannelCredential(credential: string): boolean {
  return credential.startsWith(`${CREDENTIAL_CIPHER_VERSION}:`);
}

function getCredentialEncryptionKey(): Buffer {
  // Prefer a purpose-specific secret. SESSION_SECRET keeps existing deployments
  // operational until the dedicated secret is provisioned, while the context
  // label below prevents direct key reuse across purposes.
  const configuredSecret =
    process.env.CHANNEL_CREDENTIALS_ENCRYPTION_KEY?.trim() ||
    process.env.SESSION_SECRET?.trim();

  if (!configuredSecret) {
    throw new Error(
      "CHANNEL_CREDENTIALS_ENCRYPTION_KEY or SESSION_SECRET must be set to protect channel credentials.",
    );
  }

  return createHash("sha256")
    .update(`aura-channel-credentials:${configuredSecret}`, "utf8")
    .digest();
}

export function validateChannelCredentialEncryptionConfiguration(): void {
  getCredentialEncryptionKey();
}

export function encryptChannelCredential(credential: string): string {
  const iv = randomBytes(CREDENTIAL_IV_LENGTH);
  const cipher = createCipheriv(
    CREDENTIAL_ALGORITHM,
    getCredentialEncryptionKey(),
    iv,
  );
  const ciphertext = Buffer.concat([
    cipher.update(credential, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    CREDENTIAL_CIPHER_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

export function decryptChannelCredential(encryptedCredential: string): string {
  const [version, encodedIv, encodedAuthTag, encodedCiphertext] =
    encryptedCredential.split(":");

  if (
    version !== CREDENTIAL_CIPHER_VERSION ||
    !encodedIv ||
    !encodedAuthTag ||
    !encodedCiphertext
  ) {
    throw new Error("Stored channel credential has an unsupported format.");
  }

  try {
    const iv = Buffer.from(encodedIv, "base64url");
    const authTag = Buffer.from(encodedAuthTag, "base64url");
    const ciphertext = Buffer.from(encodedCiphertext, "base64url");

    if (
      iv.length !== CREDENTIAL_IV_LENGTH ||
      authTag.length !== 16 ||
      ciphertext.length === 0
    ) {
      throw new Error("Stored channel credential has invalid ciphertext.");
    }

    const decipher = createDecipheriv(
      CREDENTIAL_ALGORITHM,
      getCredentialEncryptionKey(),
      iv,
    );
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("Stored channel credential could not be decrypted.");
  }
}