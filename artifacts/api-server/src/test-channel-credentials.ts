import assert from "node:assert/strict";
import {
  decryptChannelCredential,
  encryptChannelCredential,
  isEncryptedChannelCredential,
} from "./lib/channelCredentials";

const originalDedicatedSecret =
  process.env.CHANNEL_CREDENTIALS_ENCRYPTION_KEY;
const originalSessionSecret = process.env.SESSION_SECRET;

try {
  process.env.CHANNEL_CREDENTIALS_ENCRYPTION_KEY =
    "credential-test-key-one";
  delete process.env.SESSION_SECRET;

  const plaintext = "provider-secret-value";
  const encryptedA = encryptChannelCredential(plaintext);
  const encryptedB = encryptChannelCredential(plaintext);

  assert.equal(isEncryptedChannelCredential(encryptedA), true);
  assert.notEqual(encryptedA, plaintext);
  assert.notEqual(encryptedA, encryptedB);
  assert.equal(decryptChannelCredential(encryptedA), plaintext);

  const tamperedParts = encryptedA.split(":");
  const ciphertext = tamperedParts[3];
  assert.ok(ciphertext);
  tamperedParts[3] = `${ciphertext.slice(0, -1)}${
    ciphertext.endsWith("A") ? "B" : "A"
  }`;
  assert.throws(() => decryptChannelCredential(tamperedParts.join(":")));

  process.env.CHANNEL_CREDENTIALS_ENCRYPTION_KEY =
    "credential-test-key-two";
  assert.throws(() => decryptChannelCredential(encryptedA));

  console.log("Channel credential encryption tests passed.");
} finally {
  if (originalDedicatedSecret === undefined) {
    delete process.env.CHANNEL_CREDENTIALS_ENCRYPTION_KEY;
  } else {
    process.env.CHANNEL_CREDENTIALS_ENCRYPTION_KEY =
      originalDedicatedSecret;
  }

  if (originalSessionSecret === undefined) {
    delete process.env.SESSION_SECRET;
  } else {
    process.env.SESSION_SECRET = originalSessionSecret;
  }
}