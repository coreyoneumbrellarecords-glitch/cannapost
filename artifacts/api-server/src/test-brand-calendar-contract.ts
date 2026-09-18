/**
 * Brand, schedule, analytics, and calendar API contract regression check.
 *
 * This test uses the generated Zod schemas that validate the live route
 * inputs and outputs. It intentionally checks each response shape exposed by
 * the brand and schedule routes, plus the analytics summary and calendar.
 *
 * Run:
 *   pnpm --filter @workspace/api-server run test:brand-calendar-contract
 */

import assert from "node:assert/strict";
import {
  CreateBrandProfileBody,
  CreateBrandProfileResponse,
  CreateScheduleBody,
  CreateScheduleResponse,
  GetAnalyticsSummaryResponse,
  GetBrandProfileResponse,
  GetContentCalendarResponse,
  GetScheduleResponse,
  UpdateBrandProfileBody,
  UpdateBrandProfileResponse,
  UpdateScheduleBody,
  UpdateScheduleResponse,
} from "@workspace/api-zod";

const brandProfileFixture = {
  id: "1a2b3c4d-5e6f-4789-abcd-ef0123456789",
  userId: "contract-test-user",
  businessName: "Aura Cannabis Co.",
  industry: "cannabis_dispensary",
  instagramHandle: "@auracannabisco",
  location: "Toronto, Ontario",
  timezone: "America/Toronto",
  logoUrl: null,
  logoBase64: null,
  watermarkPosition: "bottom_right",
  showNameWatermark: true,
  brandColors: "#173F35,#C8A96B",
  primaryColor: "#173F35",
  secondaryColor: "#C8A96B",
  accentColor: "#E7B66C",
  backgroundColor: "#F7F4ED",
  fontStyle: "modern",
  brandVoice: "professional and welcoming",
  layoutGrid: "EDITORIAL",
  visualMotif: "ORGANIC",
  toneOfVoice: "SOPHISTICATED",
  visualFingerprint: "earthy luxury with high contrast",
  targetAudience: "adult cannabis consumers",
  competitorHandles: "@competitor",
  createdAt: new Date("2026-09-02T12:00:00.000Z"),
  updatedAt: new Date("2026-09-02T12:00:00.000Z"),
} as const;

const scheduleFixture = {
  id: "2b3c4d5e-6f70-489a-bcde-f01234567890",
  userId: "contract-test-user",
  frequency: "daily",
  preferredTimes: "09:00,18:00",
  timezone: "America/Toronto",
  autoPost: false,
  createdAt: new Date("2026-09-02T12:00:00.000Z"),
} as const;

const postFixture = {
  id: "4b5c6d7e-8f90-4a12-b345-67890cdef012",
  userId: "contract-test-user",
  caption: "A compliant cannabis product caption.",
  hashtags: "#ontariocannabis #legalcannabis",
  imageUrl: "data:image/svg+xml;base64,placeholder",
  prompt: "Blue Dream flower",
  platform: "instagram",
  postType: "post",
  status: "scheduled",
  scheduledAt: new Date("2026-09-03T18:00:00.000Z"),
  postedAt: null,
  instagramPostId: null,
  strainName: "Blue Dream",
  productType: "Flower",
  thcPercentage: "20-25",
  agcoCompliant: true,
  imageGenerationWarning: false,
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
    `${name} rejected a valid payload: ${result.success ? "" : String(result.error)}`,
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
    `${name} accepted an invalid payload`,
  );
}

assertSchemaAccepts("POST /brand input", CreateBrandProfileBody, {
  businessName: "Aura Cannabis Co.",
  industry: "cannabis_dispensary",
  timezone: "America/Toronto",
  showNameWatermark: true,
  primaryColor: "#173F35",
  secondaryColor: "#C8A96B",
  accentColor: "#E7B66C",
  backgroundColor: "#F7F4ED",
  fontStyle: "LUXURY",
  layoutGrid: "EDITORIAL",
  visualMotif: "ORGANIC",
  toneOfVoice: "SOPHISTICATED",
  visualFingerprint: "earthy luxury with high contrast",
});
assertSchemaRejects("POST /brand input", CreateBrandProfileBody, {
  industry: "cannabis_dispensary",
});
assertSchemaRejects("POST /brand input", CreateBrandProfileBody, {
  businessName: "Aura Cannabis Co.",
  industry: 42,
});
assertSchemaRejects("POST /brand input", CreateBrandProfileBody, {
  businessName: "Aura Cannabis Co.",
  industry: "cannabis_dispensary",
  fontStyle: "comic-sans",
});

assertSchemaAccepts("PATCH /brand input", UpdateBrandProfileBody, {
  businessName: "Aura Cannabis Co. East",
  showNameWatermark: false,
  visualFingerprint: "earthy luxury with high contrast",
});
assertSchemaRejects("PATCH /brand input", UpdateBrandProfileBody, {
  showNameWatermark: "false",
});
assertSchemaRejects("PATCH /brand input", UpdateBrandProfileBody, {
  fontStyle: "handwritten",
});

for (const [name, schema] of [
  ["GET /brand response", GetBrandProfileResponse],
  ["POST /brand response", CreateBrandProfileResponse],
  ["PATCH /brand response", UpdateBrandProfileResponse],
] as const) {
  assertSchemaAccepts(name, schema, brandProfileFixture);
}

const brandWithoutRequiredField = { ...brandProfileFixture };
delete (brandWithoutRequiredField as { businessName?: string }).businessName;
assertSchemaRejects(
  "brand response",
  GetBrandProfileResponse,
  brandWithoutRequiredField,
);

assertSchemaAccepts("POST /schedules input", CreateScheduleBody, {
  frequency: "daily",
  preferredTimes: "09:00,18:00",
  timezone: "America/Toronto",
  autoPost: false,
});
assertSchemaRejects("POST /schedules input", CreateScheduleBody, {
  timezone: "America/Toronto",
});
assertSchemaAccepts("PATCH /schedules input", UpdateScheduleBody, {
  autoPost: true,
});
assertSchemaRejects("PATCH /schedules input", UpdateScheduleBody, {
  autoPost: "true",
});

for (const [name, schema] of [
  ["GET /schedules response", GetScheduleResponse],
  ["POST /schedules response", CreateScheduleResponse],
  ["PATCH /schedules response", UpdateScheduleResponse],
] as const) {
  assertSchemaAccepts(name, schema, scheduleFixture);
}

const scheduleWithoutRequiredField = { ...scheduleFixture };
delete (scheduleWithoutRequiredField as { frequency?: string }).frequency;
assertSchemaRejects(
  "schedule response",
  GetScheduleResponse,
  scheduleWithoutRequiredField,
);

const analyticsSummaryFixture = {
  totalPosts: 4,
  publishedPosts: 1,
  scheduledPosts: 2,
  draftPosts: 1,
  estimatedReach: 850,
  thisWeekPosts: 4,
  recentPosts: [postFixture],
};
assertSchemaAccepts(
  "GET /analytics/summary response",
  GetAnalyticsSummaryResponse,
  analyticsSummaryFixture,
);

const summaryWithoutRequiredField = { ...analyticsSummaryFixture };
delete (summaryWithoutRequiredField as { estimatedReach?: number })
  .estimatedReach;
assertSchemaRejects(
  "analytics summary response",
  GetAnalyticsSummaryResponse,
  summaryWithoutRequiredField,
);

const calendarFixture = {
  entries: [
    {
      id: postFixture.id,
      scheduledAt: postFixture.scheduledAt,
      postType: postFixture.postType,
      status: postFixture.status,
      caption: postFixture.caption,
      imageUrl: postFixture.imageUrl,
    },
  ],
};
assertSchemaAccepts(
  "GET /analytics/calendar response",
  GetContentCalendarResponse,
  calendarFixture,
);

const calendarWithoutRequiredField = {
  entries: [{ ...calendarFixture.entries[0] }],
};
delete (calendarWithoutRequiredField.entries[0] as { scheduledAt?: Date })
  .scheduledAt;
assertSchemaRejects(
  "content calendar response",
  GetContentCalendarResponse,
  calendarWithoutRequiredField,
);

console.log("Brand, schedule, analytics, and calendar API contracts passed.");
