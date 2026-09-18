/**
 * Post API contract regression check.
 *
 * This test uses the generated Zod schemas that validate the live post routes.
 * It intentionally exercises the POST input, the placeholder warning fields,
 * and every post response shape exposed by the API.
 *
 * Run:
 *   pnpm --filter @workspace/api-server run test:post-contract
 */

import assert from "node:assert/strict";
import {
  GeneratePostBody,
  GeneratePostResponse,
  GetPostResponse,
  ListPostsResponse,
  PublishPostResponse,
  SchedulePostResponse,
} from "@workspace/api-zod";

const postResponseFixture = {
  id: "4b5c6d7e-8f90-4a12-b345-67890cdef012",
  userId: "contract-test-user",
  caption: "A compliant cannabis product caption.",
  hashtags: "#ontariocannabis #legalcannabis",
  imageUrl: "data:image/svg+xml;base64,placeholder",
  prompt: "Blue Dream flower",
  platform: "instagram",
  postType: "post",
  status: "draft",
  scheduledAt: null,
  postedAt: null,
  instagramPostId: null,
  strainName: "Blue Dream",
  productType: "Flower",
  thcPercentage: "20-25",
  agcoCompliant: true,
  imageGenerationWarning: true,
  imageGenerationWarningMessage:
    "Image generation is temporarily unavailable — a placeholder design was used.",
  createdAt: new Date("2026-09-02T12:00:00.000Z"),
} as const;

function assertSchemaAccepts(
  name: string,
  schema: {
    safeParse: (value: unknown) => { success: boolean; error?: unknown };
  },
  value: unknown,
): void {
  const result = schema.safeParse(value);
  assert.equal(
    result.success,
    true,
    `${name} rejected a valid response: ${result.success ? "" : String(result.error)}`,
  );
}

function assertSchemaRejects(
  name: string,
  schema: { safeParse: (value: unknown) => { success: boolean } },
  value: unknown,
): void {
  assert.equal(
    schema.safeParse(value).success,
    false,
    `${name} accepted invalid input`,
  );
}

const postInputs = [
  { prompt: "Blue Dream flower", postType: "post" },
  { prompt: "A compliant story", postType: "story" },
  { prompt: "A short SMS announcement", postType: "sms" },
  { prompt: "A new products email", postType: "email" },
  {
    prompt: "Blue Dream flower with a reference photo",
    postType: "post",
    referenceImageBase64: "data:image/png;base64,ZmFrZQ==",
  },
] as const;

for (const input of postInputs) {
  assertSchemaAccepts(
    `POST /posts input (${input.postType})`,
    GeneratePostBody,
    input,
  );
}

assertSchemaRejects("POST /posts input", GeneratePostBody, {});
assertSchemaRejects("POST /posts input", GeneratePostBody, {
  prompt: "Invalid post type",
  postType: "reel",
});

const responseChecks = [
  ["POST /posts response", GeneratePostResponse, postResponseFixture],
  [
    "GET /posts response",
    ListPostsResponse,
    { posts: [postResponseFixture], total: 1, page: 1, limit: 20 },
  ],
  ["GET /posts/:id response", GetPostResponse, postResponseFixture],
  [
    "POST /posts/:id/schedule response",
    SchedulePostResponse,
    postResponseFixture,
  ],
  [
    "POST /posts/:id/publish response",
    PublishPostResponse,
    postResponseFixture,
  ],
] as const;

for (const [name, schema, response] of responseChecks) {
  assertSchemaAccepts(name, schema, response);
}

const withoutRequiredPostField = { ...postResponseFixture };
delete (withoutRequiredPostField as { caption?: string }).caption;
assertSchemaRejects(
  "post response",
  GeneratePostResponse,
  withoutRequiredPostField,
);

assert.equal(
  GeneratePostResponse.parse(postResponseFixture).imageGenerationWarning,
  true,
  "POST /posts response must preserve imageGenerationWarning",
);
assert.equal(
  GeneratePostResponse.parse(postResponseFixture).imageGenerationWarningMessage,
  postResponseFixture.imageGenerationWarningMessage,
  "POST /posts response must preserve imageGenerationWarningMessage",
);

console.log(
  `Post API contract check passed: ${postInputs.length} inputs and ${responseChecks.length} response paths.`,
);
