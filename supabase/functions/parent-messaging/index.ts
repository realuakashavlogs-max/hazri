import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AttendanceKey = "present" | "absent" | "late" | "leave";

type VerifiedFacts = {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  recordDate: string;
  hasAttendanceRecord: boolean;
  attendanceStatus: AttendanceKey | null;
  hasPerformanceRecord: boolean;
  sabaqListened: boolean | null;
  sabaqLines: number | null;
  sabqiListened: boolean | null;
  sabqiLines: number | null;
  manzilListened: boolean | null;
  manzilLines: number | null;
};

const URDU_ATTENDANCE: Record<AttendanceKey, string> = {
  present: "حاضر",
  absent: "غیر حاضر",
  late: "تاخیر سے حاضر",
  leave: "رخصت",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhoneDigits(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (/^03\d{9}$/.test(digits)) return "92" + digits.slice(1);
  return digits;
}

function composeVerifiedUrduMessage(facts: VerifiedFacts, appName = "Hazri Book"): string {
  if ((!facts.hasAttendanceRecord && !facts.hasPerformanceRecord) || !facts.attendanceStatus) {
    throw new Error("No recorded attendance or daily performance data for this date.");
  }

  const cleanApp = appName.trim() || "Hazri Book";
  const statusUrdu = URDU_ATTENDANCE[facts.attendanceStatus];
  const classPart = facts.className ? ` (${facts.className})` : "";

  const lines: string[] = [
    "السلام علیکم، محترم والدین!",
    `${cleanApp} کی جانب سے ${facts.studentName}${classPart} کی مورخہ ${facts.recordDate} کی تصدیق شدہ رپورٹ:`,
    `• حاضری: ${statusUrdu}`,
  ];

  if (facts.hasPerformanceRecord) {
    const sabaqText = facts.sabaqListened
      ? `سنایا گیا (${facts.sabaqLines ?? 0} سطور)`
      : "نہیں سنایا (0 سطور)";
    const sabqiText = facts.sabqiListened
      ? `سنی گئی (${facts.sabqiLines ?? 0} سطور)`
      : "نہیں سنی (0 سطور)";
    const manzilText = facts.manzilListened
      ? `سنی گئی (${facts.manzilLines ?? 0} سطور)`
      : "نہیں سنی (0 سطور)";

    lines.push(`• سبق: ${sabaqText}`);
    lines.push(`• سبقی: ${sabqiText}`);
    lines.push(`• منزل: ${manzilText}`);
  } else if (facts.attendanceStatus === "absent") {
    lines.push("براہ کرم غیر حاضری کی اطلاع سے آگاہ رہیں۔");
  }

  lines.push(`جزاکم اللہ خیراً، ${cleanApp}`);
  return lines.join("\n");
}

function verifyUrduMessageFacts(message: string, facts: VerifiedFacts): boolean {
  const trimmed = message.trim();
  if (!trimmed || !facts.attendanceStatus) return false;
  if (!trimmed.includes(facts.studentName)) return false;
  if (!trimmed.includes(URDU_ATTENDANCE[facts.attendanceStatus])) return false;

  if (facts.hasPerformanceRecord) {
    if (facts.sabaqListened && !trimmed.includes(String(facts.sabaqLines ?? 0))) return false;
    if (facts.sabqiListened && !trimmed.includes(String(facts.sabqiLines ?? 0))) return false;
    if (facts.manzilListened && !trimmed.includes(String(facts.manzilLines ?? 0))) return false;
  } else if (/\b\d+\s*سطور/.test(trimmed)) {
    return false;
  }

  return true;
}

function getProviderAvailability() {
  const whatsappApi = Boolean(
    Deno.env.get("WHATSAPP_ACCESS_TOKEN") &&
      Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") &&
      Deno.env.get("WHATSAPP_GRAPH_API_VERSION")
  );
  const telegram = Boolean(Deno.env.get("TELEGRAM_BOT_TOKEN"));
  const sms = Boolean(
    Deno.env.get("TWILIO_ACCOUNT_SID") &&
      Deno.env.get("TWILIO_AUTH_TOKEN") &&
      Deno.env.get("TWILIO_FROM_NUMBER")
  );
  const email = Boolean(Deno.env.get("RESEND_API_KEY") && Deno.env.get("RESEND_FROM_EMAIL"));
  const aiLlm = Boolean(Deno.env.get("GEMINI_API_KEY"));

  return { whatsapp_api: whatsappApi, telegram, sms, email, ai_llm: aiLlm };
}

async function generateWithGeminiIfConfigured(
  facts: VerifiedFacts,
  appName: string
): Promise<{ text: string; source: "ai_verified" | "verified_composer" }> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const fallback = composeVerifiedUrduMessage(facts, appName);
  if (!geminiKey) {
    return { text: fallback, source: "verified_composer" };
  }

  const promptPayload = {
    appName,
    studentName: facts.studentName,
    className: facts.className,
    recordDate: facts.recordDate,
    attendanceUrdu: facts.attendanceStatus ? URDU_ATTENDANCE[facts.attendanceStatus] : null,
    hasPerformanceRecord: facts.hasPerformanceRecord,
    sabaq: facts.hasPerformanceRecord
      ? { listened: facts.sabaqListened, lines: facts.sabaqLines }
      : null,
    sabqi: facts.hasPerformanceRecord
      ? { listened: facts.sabqiListened, lines: facts.sabqiLines }
      : null,
    manzil: facts.hasPerformanceRecord
      ? { listened: facts.manzilListened, lines: facts.manzilLines }
      : null,
  };

  const systemPrompt = [
    "You are an assistant for a Madrasa attendance & Hifz tracking app.",
    "Write a short, polite, clear parent message ONLY in Urdu script based strictly on the provided JSON facts.",
    "CRITICAL RULES:",
    "1. Include the exact studentName and exact attendanceUrdu string verbatim.",
    "2. If hasPerformanceRecord is true, state Sabaq (سبق), Sabqi (سبقی), and Manzil (منزل) listening status (ہاں/نہیں or سنایا گیا/نہیں سنایا) and the EXACT line numbers (سطور).",
    "3. If hasPerformanceRecord is false, DO NOT mention or invent any Sabaq, Sabqi, Manzil, or line numbers.",
    "4. Never add Surah, Ayah, Para, remarks, grades, or invented facts.",
    "5. Output plain Urdu text only (no markdown headings or code blocks).",
  ].join("\n");

  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: JSON.stringify(promptPayload) }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 320 },
        }),
      }
    );

    if (!res.ok) {
      return { text: fallback, source: "verified_composer" };
    }

    const data = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (candidateText && verifyUrduMessageFacts(candidateText, facts)) {
      return { text: candidateText, source: "ai_verified" };
    }
  } catch {
    // Fall back safely to deterministic verified Urdu composer
  }

  return { text: fallback, source: "verified_composer" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "Authentication required" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const keys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const publishableKey = keys ? JSON.parse(keys).default : anonKey;
  if (!url || !publishableKey) {
    return json({ error: "Supabase function environment is incomplete" }, 500);
  }

  const supabase = createClient(url, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: "Invalid session" }, 401);
  const userId = authData.user.id;

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("role, is_blocked")
    .eq("id", userId)
    .maybeSingle();

  if (profileRow?.is_blocked) {
    return json({ error: "Account is blocked" }, 403);
  }
  const isAdmin = profileRow?.role === "admin";

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const action = String(body.action || "");

  if (action === "status") {
    return json({ providers: getProviderAvailability(), isAdmin });
  }

  if (action === "generate") {
    const studentId = String(body.studentId || "");
    const recordDate = String(body.recordDate || "");
    const appName = String(body.appName || "Hazri Book");

    if (!studentId || !/^\d{4}-\d{2}-\d{2}$/.test(recordDate)) {
      return json({ error: "studentId and recordDate (YYYY-MM-DD) are required" }, 400);
    }

    let studentQuery = supabase
      .from("students")
      .select("id, user_id, class_id, name")
      .eq("id", studentId);
    if (!isAdmin) studentQuery = studentQuery.eq("user_id", userId);
    const { data: student, error: studentErr } = await studentQuery.maybeSingle();

    if (studentErr || !student) {
      return json({ error: "Student not found or access denied" }, 404);
    }

    const [{ data: classRow }, { data: perfRow }, { data: attRow }, { data: statuses }] =
      await Promise.all([
        supabase.from("classes").select("id, name").eq("id", student.class_id).maybeSingle(),
        supabase
          .from("student_daily_performance")
          .select(
            "attendance_status, sabaq_listened, sabaq_lines, sabqi_listened, sabqi_lines, manzil_listened, manzil_lines"
          )
          .eq("student_id", student.id)
          .eq("record_date", recordDate)
          .maybeSingle(),
        supabase
          .from("attendance_records")
          .select("status_id")
          .eq("student_id", student.id)
          .eq("attendance_date", recordDate)
          .maybeSingle(),
        supabase.from("attendance_statuses").select("id, key").eq("user_id", student.user_id),
      ]);

    const statusKeyById = new Map((statuses || []).map((s: { id: string; key: string }) => [s.id, s.key]));
    const attendanceStatus =
      (perfRow?.attendance_status as AttendanceKey | undefined) ??
      (attRow ? (statusKeyById.get(attRow.status_id) as AttendanceKey | undefined) : undefined) ??
      null;

    const facts: VerifiedFacts = {
      studentId: student.id,
      studentName: student.name,
      classId: student.class_id,
      className: classRow?.name || "",
      recordDate,
      hasAttendanceRecord: Boolean(attRow || perfRow),
      attendanceStatus,
      hasPerformanceRecord: Boolean(perfRow),
      sabaqListened: perfRow ? Boolean(perfRow.sabaq_listened) : null,
      sabaqLines: perfRow ? (perfRow.sabaq_listened ? Math.max(0, perfRow.sabaq_lines ?? 0) : 0) : null,
      sabqiListened: perfRow ? Boolean(perfRow.sabqi_listened) : null,
      sabqiLines: perfRow ? (perfRow.sabqi_listened ? Math.max(0, perfRow.sabqi_lines ?? 0) : 0) : null,
      manzilListened: perfRow ? Boolean(perfRow.manzil_listened) : null,
      manzilLines: perfRow ? (perfRow.manzil_listened ? Math.max(0, perfRow.manzil_lines ?? 0) : 0) : null,
    };

    if ((!facts.hasAttendanceRecord && !facts.hasPerformanceRecord) || !facts.attendanceStatus) {
      return json(
        {
          error: "No daily attendance or Sabaq record found for this student and date.",
          code: "NO_RECORD_FOR_DATE",
        },
        422
      );
    }

    const generated = await generateWithGeminiIfConfigured(facts, appName);
    return json({
      messageUrdu: generated.text,
      generatedBy: generated.source,
      facts,
    });
  }

  if (action === "send") {
    const messageId = String(body.messageId || "");
    const sendMode = body.sendMode === "automatic" ? "automatic" : "manual";
    if (!messageId) return json({ error: "messageId is required" }, 400);

    let msgQuery = supabase.from("parent_messages").select("*").eq("id", messageId);
    if (!isAdmin) msgQuery = msgQuery.eq("user_id", userId);
    const { data: msgRow, error: msgErr } = await msgQuery.maybeSingle();

    if (msgErr || !msgRow) {
      return json({ error: "Message not found or access denied" }, 404);
    }

    const [{ data: student }, { data: settings }] = await Promise.all([
      supabase
        .from("students")
        .select("id, name, parent_phone, messaging_consent, telegram_chat_id, parent_email")
        .eq("id", msgRow.student_id)
        .maybeSingle(),
      supabase.from("messaging_settings").select("*").eq("id", 1).maybeSingle(),
    ]);

    if (!student) return json({ error: "Student not found" }, 404);

    if (msgRow.approval_status !== "approved") {
      return json(
        { error: "Message must be reviewed and approved before sending.", code: "APPROVAL_REQUIRED" },
        403
      );
    }

    if (!student.messaging_consent) {
      await supabase
        .from("parent_messages")
        .update({
          delivery_status: "blocked",
          error_message: "Parent messaging consent is required before sending.",
        })
        .eq("id", msgRow.id);
      return json(
        { error: "Parent messaging consent has not been granted.", code: "CONSENT_REQUIRED" },
        403
      );
    }

    if (sendMode === "automatic" && !settings?.auto_send_enabled) {
      await supabase
        .from("parent_messages")
        .update({
          delivery_status: "blocked",
          error_message: "Automatic messaging is disabled by Admin.",
        })
        .eq("id", msgRow.id);
      return json(
        { error: "Automatic messaging is currently disabled by Admin.", code: "AUTO_SEND_DISABLED" },
        403
      );
    }

    const channel = String(msgRow.channel);
    const channelFlagMap: Record<string, boolean | undefined> = {
      whatsapp_api: settings?.whatsapp_api_enabled,
      telegram: settings?.telegram_api_enabled,
      sms: settings?.sms_api_enabled,
      email: settings?.email_api_enabled,
    };
    if (channel in channelFlagMap && channelFlagMap[channel] === false) {
      await supabase
        .from("parent_messages")
        .update({
          delivery_status: "blocked",
          error_message: `${channel} is disabled by Admin in messaging controls.`,
        })
        .eq("id", msgRow.id);
      return json(
        { error: `${channel} messaging is disabled by Admin.`, code: "CHANNEL_DISABLED" },
        403
      );
    }

    const availability = getProviderAvailability();

    if (channel === "whatsapp_api") {
      if (!availability.whatsapp_api) {
        await supabase
          .from("parent_messages")
          .update({
            delivery_status: "failed",
            error_message: "WhatsApp Business Cloud API secrets are not configured on the server.",
          })
          .eq("id", msgRow.id);
        return json(
          { error: "WhatsApp Business API is not configured on the server.", code: "NOT_CONFIGURED" },
          400
        );
      }

      const toDigits = normalizePhoneDigits(student.parent_phone);
      if (!toDigits) {
        return json({ error: "Valid parent WhatsApp phone number is required." }, 400);
      }

      const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;
      const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
      const graphVersion = Deno.env.get("WHATSAPP_GRAPH_API_VERSION")!;

      const apiRes = await fetch(
        `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: toDigits,
            type: "text",
            text: { preview_url: false, body: msgRow.message_urdu },
          }),
        }
      );

      const apiJson = await apiRes.json();
      const providerId = apiJson?.messages?.[0]?.id || null;
      if (!apiRes.ok || !providerId) {
        const errMsg = apiJson?.error?.message || `WhatsApp API error (${apiRes.status})`;
        await supabase
          .from("parent_messages")
          .update({ delivery_status: "failed", error_message: errMsg })
          .eq("id", msgRow.id);
        return json({ error: errMsg, deliveryStatus: "failed" }, 502);
      }

      await supabase
        .from("parent_messages")
        .update({
          delivery_status: "sent",
          send_mode: sendMode,
          provider_message_id: providerId,
          sent_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", msgRow.id);

      return json({ deliveryStatus: "sent", providerMessageId: providerId });
    }

    if (channel === "telegram") {
      if (!availability.telegram) {
        await supabase
          .from("parent_messages")
          .update({
            delivery_status: "failed",
            error_message: "Telegram Bot API token is not configured on the server.",
          })
          .eq("id", msgRow.id);
        return json(
          { error: "Telegram Bot API is not configured on the server.", code: "NOT_CONFIGURED" },
          400
        );
      }
      const chatId = student.telegram_chat_id?.trim();
      if (!chatId) {
        return json({ error: "Parent Telegram Chat ID is missing on the student record." }, 400);
      }

      const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
      const apiRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msgRow.message_urdu }),
      });
      const apiJson = await apiRes.json();
      const providerId = apiJson?.result?.message_id ? String(apiJson.result.message_id) : null;

      if (!apiRes.ok || !apiJson?.ok || !providerId) {
        const errMsg = apiJson?.description || `Telegram API error (${apiRes.status})`;
        await supabase
          .from("parent_messages")
          .update({ delivery_status: "failed", error_message: errMsg })
          .eq("id", msgRow.id);
        return json({ error: errMsg, deliveryStatus: "failed" }, 502);
      }

      await supabase
        .from("parent_messages")
        .update({
          delivery_status: "sent",
          send_mode: sendMode,
          provider_message_id: providerId,
          sent_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", msgRow.id);

      return json({ deliveryStatus: "sent", providerMessageId: providerId });
    }

    if (channel === "sms") {
      if (!availability.sms) {
        await supabase
          .from("parent_messages")
          .update({
            delivery_status: "failed",
            error_message: "Twilio SMS API secrets are not configured on the server.",
          })
          .eq("id", msgRow.id);
        return json(
          { error: "SMS API is not configured on the server.", code: "NOT_CONFIGURED" },
          400
        );
      }
      const digits = normalizePhoneDigits(student.parent_phone);
      if (!digits) return json({ error: "Valid parent phone number is required for SMS." }, 400);

      const sid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
      const token = Deno.env.get("TWILIO_AUTH_TOKEN")!;
      const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER")!;

      const formBody = new URLSearchParams({
        To: `+${digits}`,
        From: fromNumber,
        Body: msgRow.message_urdu,
      });

      const apiRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formBody.toString(),
        }
      );
      const apiJson = await apiRes.json();
      const providerId = apiJson?.sid || null;

      if (!apiRes.ok || !providerId) {
        const errMsg = apiJson?.message || `SMS API error (${apiRes.status})`;
        await supabase
          .from("parent_messages")
          .update({ delivery_status: "failed", error_message: errMsg })
          .eq("id", msgRow.id);
        return json({ error: errMsg, deliveryStatus: "failed" }, 502);
      }

      const mappedStatus = apiJson?.status === "delivered"
        ? "delivered"
        : apiJson?.status === "sent"
          ? "sent"
          : "queued";

      await supabase
        .from("parent_messages")
        .update({
          delivery_status: mappedStatus,
          send_mode: sendMode,
          provider_message_id: providerId,
          sent_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", msgRow.id);

      return json({ deliveryStatus: mappedStatus, providerMessageId: providerId });
    }

    if (channel === "email") {
      if (!availability.email) {
        await supabase
          .from("parent_messages")
          .update({
            delivery_status: "failed",
            error_message: "Email API secrets (RESEND_API_KEY, RESEND_FROM_EMAIL) are not configured.",
          })
          .eq("id", msgRow.id);
        return json(
          { error: "Email API is not configured on the server.", code: "NOT_CONFIGURED" },
          400
        );
      }
      const parentEmail = student.parent_email?.trim();
      if (!parentEmail) {
        return json({ error: "Parent email address is missing on the student record." }, 400);
      }

      const resendKey = Deno.env.get("RESEND_API_KEY")!;
      const fromEmail = Deno.env.get("RESEND_FROM_EMAIL")!;

      const apiRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [parentEmail],
          subject: `${student.name} — روزانہ حاضری اور سبق رپورٹ (${msgRow.record_date})`,
          text: msgRow.message_urdu,
        }),
      });
      const apiJson = await apiRes.json();
      const providerId = apiJson?.id || null;

      if (!apiRes.ok || !providerId) {
        const errMsg = apiJson?.message || `Email API error (${apiRes.status})`;
        await supabase
          .from("parent_messages")
          .update({ delivery_status: "failed", error_message: errMsg })
          .eq("id", msgRow.id);
        return json({ error: errMsg, deliveryStatus: "failed" }, 502);
      }

      await supabase
        .from("parent_messages")
        .update({
          delivery_status: "sent",
          send_mode: sendMode,
          provider_message_id: providerId,
          sent_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", msgRow.id);

      return json({ deliveryStatus: "sent", providerMessageId: providerId });
    }

    return json({ error: `Unsupported channel for automatic send: ${channel}` }, 400);
  }

  if (action === "refresh_status") {
    const messageId = String(body.messageId || "");
    if (!messageId) return json({ error: "messageId is required" }, 400);

    let msgQuery = supabase.from("parent_messages").select("*").eq("id", messageId);
    if (!isAdmin) msgQuery = msgQuery.eq("user_id", userId);
    const { data: msgRow, error: msgErr } = await msgQuery.maybeSingle();

    if (msgErr || !msgRow) {
      return json({ error: "Message not found or access denied" }, 404);
    }

    if (!msgRow.provider_message_id) {
      return json({
        deliveryStatus: msgRow.delivery_status,
        supported: false,
        message: "No provider confirmation ID exists for this message.",
      });
    }

    if (msgRow.channel === "sms") {
      const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const token = Deno.env.get("TWILIO_AUTH_TOKEN");
      if (!sid || !token) return json({ error: "Twilio secrets not configured" }, 400);

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages/${msgRow.provider_message_id}.json`,
        { headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}` } }
      );
      const data = await res.json();
      if (!res.ok) return json({ error: data?.message || "Failed to refresh SMS status" }, 502);

      const statusMap: Record<string, string> = {
        delivered: "delivered",
        sent: "sent",
        queued: "queued",
        sending: "queued",
        failed: "failed",
        undelivered: "failed",
      };
      const nextStatus = statusMap[String(data.status || "")] || msgRow.delivery_status;
      await supabase
        .from("parent_messages")
        .update({
          delivery_status: nextStatus,
          error_message: data.error_message || null,
        })
        .eq("id", msgRow.id);

      return json({ deliveryStatus: nextStatus, supported: true });
    }

    if (msgRow.channel === "email") {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (!resendKey) return json({ error: "Resend API key not configured" }, 400);

      const res = await fetch(`https://api.resend.com/emails/${msgRow.provider_message_id}`, {
        headers: { Authorization: `Bearer ${resendKey}` },
      });
      const data = await res.json();
      if (!res.ok) return json({ error: data?.message || "Failed to refresh email status" }, 502);

      const event = String(data?.last_event || "");
      const nextStatus =
        event === "delivered"
          ? "delivered"
          : event === "bounced" || event === "complained"
            ? "failed"
            : msgRow.delivery_status;
      await supabase
        .from("parent_messages")
        .update({ delivery_status: nextStatus })
        .eq("id", msgRow.id);

      return json({ deliveryStatus: nextStatus, supported: true });
    }

    return json({
      deliveryStatus: msgRow.delivery_status,
      supported: false,
      message: "Delivery receipts for this channel require webhook confirmation or manual check.",
    });
  }

  return json({ error: "Unsupported action" }, 400);
});
