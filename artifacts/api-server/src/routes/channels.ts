import { Router } from "express";
import { db } from "@workspace/db";
import { brandProfilesTable, channelSettingsTable, postsTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { requireAuth, getUserId } from "../lib/auth";
import {
  decryptChannelCredential,
  encryptChannelCredential,
  isEncryptedChannelCredential,
} from "../lib/channelCredentials";

const router = Router();

// ─── Helper: get settings row for userId ────────────────────────────────────

async function getSettingsRow(userId: string) {
  const rows = await db
    .select()
    .from(channelSettingsTable)
    .where(eq(channelSettingsTable.userId, userId))
    .limit(1);
  let row = rows[0];
  if (!row) return null;

  if (row.smsAuthToken && !isEncryptedChannelCredential(row.smsAuthToken)) {
    const plaintextSmsAuthToken = row.smsAuthToken;
    const [migratedRow] = await db
      .update(channelSettingsTable)
      .set({
        smsAuthToken: encryptChannelCredential(plaintextSmsAuthToken),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(channelSettingsTable.userId, userId),
          eq(channelSettingsTable.smsAuthToken, plaintextSmsAuthToken),
        ),
      )
      .returning();
    row = migratedRow ?? (await getCurrentSettingsRow(userId));
  }

  if (
    row?.emailSendgridApiKey &&
    !isEncryptedChannelCredential(row.emailSendgridApiKey)
  ) {
    const plaintextSendgridApiKey = row.emailSendgridApiKey;
    const [migratedRow] = await db
      .update(channelSettingsTable)
      .set({
        emailSendgridApiKey: encryptChannelCredential(plaintextSendgridApiKey),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(channelSettingsTable.userId, userId),
          eq(
            channelSettingsTable.emailSendgridApiKey,
            plaintextSendgridApiKey,
          ),
        ),
      )
      .returning();
    row = migratedRow ?? (await getCurrentSettingsRow(userId));
  }

  return row;
}

async function getCurrentSettingsRow(userId: string) {
  const rows = await db
    .select()
    .from(channelSettingsTable)
    .where(eq(channelSettingsTable.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

async function getBusinessName(userId: string): Promise<string> {
  const rows = await db
    .select({ businessName: brandProfilesTable.businessName })
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.userId, userId))
    .limit(1);
  return rows[0]?.businessName || "Your Store";
}

async function getOwnedPost(userId: string, postId: unknown) {
  const normalizedPostId = typeof postId === "number" ? String(postId) : postId?.toString().trim();
  if (
    !normalizedPostId ||
    !(
      /^\d+$/.test(normalizedPostId) ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizedPostId)
    )
  ) {
    return null;
  }
  const rows = await db
    .select({
      id: postsTable.id,
      userId: postsTable.userId,
      caption: postsTable.caption,
    })
    .from(postsTable)
    .where(sql`${postsTable.id}::text = ${normalizedPostId}`)
    .limit(1);
  const post = rows[0] ?? null;
  return post?.userId === userId ? post : null;
}

function parseRecipients(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const recipients = [...new Set(
    value
      .filter((recipient): recipient is string => typeof recipient === "string")
      .map((recipient) => recipient.trim())
      .filter(Boolean),
  )];
  return recipients.length > 0 && recipients.length <= 100 ? recipients : null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getEmailContent(caption: string) {
  const subjectMatch = caption.match(/^📧 Subject:\s*(.+)$/m);
  const previewMatch = caption.match(/^👁 Preview:\s*(.+)$/m);
  const body = caption
    .split("\n")
    .filter((line) => !line.startsWith("📧 Subject:") && !line.startsWith("👁 Preview:"))
    .join("\n")
    .trim();

  return {
    subject: subjectMatch?.[1]?.trim() || "A new update from your dispensary",
    preview: previewMatch?.[1]?.trim() || "",
    body,
  };
}

const SMS_PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isTrustedBrowserRequest(req: Parameters<typeof requireAuth>[0]): boolean {
  if (req.get("sec-fetch-site") === "cross-site") return false;
  const origin = req.get("origin");
  if (!origin) return true;

  try {
    const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
    const requestHost = forwardedHost || req.get("host");
    return new URL(origin).host === requestHost;
  } catch {
    return false;
  }
}

// ─── SMS ────────────────────────────────────────────────────────────────────

router.get("/channels/sms", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const row = await getSettingsRow(userId);

  if (!row || !row.smsSenderPhone) {
    res.json({ connected: false });
    return;
  }

  // Never return the auth token to the client
  res.json({
    connected: true,
    accountSid: row.smsAccountSid,
    senderPhone: row.smsSenderPhone,
    agcoFooter: row.smsAgcoFooter,
  });
});

router.put("/channels/sms", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { accountSid, authToken, senderPhone, agcoFooter } = req.body ?? {};

  if (!accountSid || typeof accountSid !== "string" || !accountSid.trim()) {
    res.status(400).json({ error: "accountSid is required" });
    return;
  }
  if (!authToken || typeof authToken !== "string" || !authToken.trim()) {
    res.status(400).json({ error: "authToken is required" });
    return;
  }
  if (!senderPhone || typeof senderPhone !== "string" || !senderPhone.trim()) {
    res.status(400).json({ error: "senderPhone is required" });
    return;
  }

  const normalizedAgcoFooter = agcoFooter !== false; // default true

  const existing = await getSettingsRow(userId);

  if (existing) {
    const [updated] = await db
      .update(channelSettingsTable)
      .set({
        smsAccountSid: accountSid.trim(),
        smsAuthToken: encryptChannelCredential(authToken.trim()),
        smsSenderPhone: senderPhone.trim(),
        smsAgcoFooter: normalizedAgcoFooter,
        updatedAt: new Date(),
      })
      .where(eq(channelSettingsTable.userId, userId))
      .returning();
    res.json({
      connected: true,
      accountSid: updated.smsAccountSid,
      senderPhone: updated.smsSenderPhone,
      agcoFooter: updated.smsAgcoFooter,
    });
    return;
  }

  const [inserted] = await db
    .insert(channelSettingsTable)
    .values({
      userId,
      smsAccountSid: accountSid.trim(),
      smsAuthToken: encryptChannelCredential(authToken.trim()),
      smsSenderPhone: senderPhone.trim(),
      smsAgcoFooter: normalizedAgcoFooter,
    })
    .returning();

  res.status(201).json({
    connected: true,
    accountSid: inserted.smsAccountSid,
    senderPhone: inserted.smsSenderPhone,
    agcoFooter: inserted.smsAgcoFooter,
  });
});

router.post("/channels/sms/send", requireAuth, async (req, res): Promise<void> => {
  if (!isTrustedBrowserRequest(req)) {
    res.status(403).json({ error: "Cross-site send requests are not allowed." });
    return;
  }

  const userId = getUserId(req);
  const recipients = parseRecipients(req.body?.recipients);
  if (!recipients || recipients.some((recipient) => !SMS_PHONE_PATTERN.test(recipient))) {
    res.status(400).json({
      error: "Provide one to 100 recipients in E.164 format (for example, +14165551234).",
    });
    return;
  }

  const post = await getOwnedPost(userId, req.body?.postId);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const settings = await getSettingsRow(userId);
  if (!settings?.smsAccountSid || !settings.smsAuthToken || !settings.smsSenderPhone) {
    res.status(400).json({ error: "Connect Twilio in Settings before sending an SMS." });
    return;
  }

  let smsAuthToken: string;
  try {
    smsAuthToken = decryptChannelCredential(settings.smsAuthToken);
  } catch (error) {
    req.log.error({ err: error }, "Stored Twilio credential could not be decrypted");
    res.status(500).json({ error: "Stored Twilio credentials are unavailable. Reconnect Twilio in Settings." });
    return;
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(settings.smsAccountSid)}/Messages.json`;
  const auth = Buffer.from(`${settings.smsAccountSid}:${smsAuthToken}`).toString("base64");
  const businessName = settings.smsAgcoFooter ? await getBusinessName(userId) : "";
  const messageBody = settings.smsAgcoFooter
    ? `${post.caption}\n\nReply STOP to cancel. 19+ ON only. ${businessName}`
    : post.caption;

  let sentCount = 0;
  try {
    for (const recipient of recipients) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: recipient,
          From: settings.smsSenderPhone,
          Body: messageBody,
        }),
      });

      if (!response.ok) {
        req.log.warn({ providerStatus: response.status }, "Twilio rejected SMS send");
        continue;
      }
      sentCount += 1;
    }

    const failedCount = recipients.length - sentCount;
    if (sentCount === 0) {
      res.status(502).json({
        error: "Twilio could not send the SMS. Check your settings and try again.",
        sentCount,
        failedCount,
      });
      return;
    }
    if (failedCount > 0) {
      res.status(207).json({ sent: false, channel: "sms", recipientCount: recipients.length, sentCount, failedCount });
      return;
    }
    res.json({ sent: true, channel: "sms", recipientCount: recipients.length, sentCount, failedCount });
  } catch (error) {
    req.log.error({ err: error }, "Twilio SMS request failed");
    res.status(502).json({
      error: sentCount > 0
        ? `Twilio became unavailable after sending ${sentCount} message${sentCount === 1 ? "" : "s"}.`
        : "Unable to reach Twilio. Please try again.",
      sentCount,
      failedCount: recipients.length - sentCount,
    });
  }
});

// ─── Email ──────────────────────────────────────────────────────────────────

router.get("/channels/email", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const row = await getSettingsRow(userId);

  if (!row || !row.emailSenderEmail) {
    res.json({ connected: false });
    return;
  }

  // Never return the API key to the client
  res.json({
    connected: true,
    senderEmail: row.emailSenderEmail,
  });
});

router.put("/channels/email", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { sendgridApiKey, senderEmail } = req.body ?? {};

  if (!sendgridApiKey || typeof sendgridApiKey !== "string" || !sendgridApiKey.trim()) {
    res.status(400).json({ error: "sendgridApiKey is required" });
    return;
  }
  if (!senderEmail || typeof senderEmail !== "string" || !senderEmail.includes("@")) {
    res.status(400).json({ error: "A valid senderEmail is required" });
    return;
  }

  const existing = await getSettingsRow(userId);

  if (existing) {
    const [updated] = await db
      .update(channelSettingsTable)
      .set({
        emailSendgridApiKey: encryptChannelCredential(sendgridApiKey.trim()),
        emailSenderEmail: senderEmail.trim(),
        updatedAt: new Date(),
      })
      .where(eq(channelSettingsTable.userId, userId))
      .returning();
    res.json({ connected: true, senderEmail: updated.emailSenderEmail });
    return;
  }

  const [inserted] = await db
    .insert(channelSettingsTable)
    .values({
      userId,
      emailSendgridApiKey: encryptChannelCredential(sendgridApiKey.trim()),
      emailSenderEmail: senderEmail.trim(),
    })
    .returning();

  res.status(201).json({ connected: true, senderEmail: inserted.emailSenderEmail });
});

router.post("/channels/email/send", requireAuth, async (req, res): Promise<void> => {
  if (!isTrustedBrowserRequest(req)) {
    res.status(403).json({ error: "Cross-site send requests are not allowed." });
    return;
  }

  const userId = getUserId(req);
  const recipients = parseRecipients(req.body?.recipients);
  if (!recipients || recipients.some((recipient) => !EMAIL_PATTERN.test(recipient))) {
    res.status(400).json({
      error: "Provide one to 100 valid recipient email addresses.",
    });
    return;
  }

  const post = await getOwnedPost(userId, req.body?.postId);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const settings = await getSettingsRow(userId);
  if (!settings?.emailSendgridApiKey || !settings.emailSenderEmail) {
    res.status(400).json({ error: "Connect SendGrid in Settings before sending an email." });
    return;
  }

  const businessName = await getBusinessName(userId);
  const email = getEmailContent(post.caption);
  const unsubscribeMailto = `mailto:${settings.emailSenderEmail}?subject=UNSUBSCRIBE`;
  const htmlBody = email.body
    .split(/\n+/)
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
  const preview = email.preview ? `<p style="color:#5f6b63;font-size:14px;">${escapeHtml(email.preview)}</p>` : "";
  const footer = `
    <hr style="border:0;border-top:1px solid #dce5df;margin:28px 0 20px;">
    <p style="color:#5f6b63;font-size:12px;line-height:1.6;">
      You are receiving this email because you opted in to receive promotional communications from us.<br><br>
      This offer is valid for individuals 19 years of age or older. Applicable in Ontario only.<br><br>
      To unsubscribe from future marketing emails, <a href="${escapeHtml(unsubscribeMailto)}">send an unsubscribe request</a>
      or reply with "UNSUBSCRIBE".<br><br>
      This communication is intended for adults in Ontario, Canada only and is not directed at persons under the age of 19.
      Cannabis is not for everyone. Please consume responsibly.<br><br>
      ${escapeHtml(businessName)} · Ontario, Canada
    </p>`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#18251b;line-height:1.6;">
      ${htmlBody}${preview}${footer}
    </div>`;

  let emailSendgridApiKey: string;
  try {
    emailSendgridApiKey = decryptChannelCredential(settings.emailSendgridApiKey);
  } catch (error) {
    req.log.error({ err: error }, "Stored SendGrid credential could not be decrypted");
    res.status(500).json({ error: "Stored SendGrid credentials are unavailable. Reconnect SendGrid in Settings." });
    return;
  }

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${emailSendgridApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: recipients.map((emailAddress) => ({
          to: [{ email: emailAddress }],
          headers: {
            "List-Unsubscribe": `<${unsubscribeMailto}>`,
          },
        })),
        from: { email: settings.emailSenderEmail },
        subject: email.subject,
        content: [{ type: "text/html", value: html }],
      }),
    });

    if (!response.ok) {
      req.log.warn({ providerStatus: response.status }, "SendGrid rejected email send");
      res.status(502).json({ error: "SendGrid could not send the email. Check your settings and try again." });
      return;
    }

    res.json({ sent: true, channel: "email", recipientCount: recipients.length });
  } catch (error) {
    req.log.error({ err: error }, "SendGrid email request failed");
    res.status(502).json({ error: "Unable to reach SendGrid. Please try again." });
  }
});

export default router;
