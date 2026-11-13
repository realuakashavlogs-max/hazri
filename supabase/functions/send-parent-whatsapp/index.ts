import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type StatusRow = { id: string; key: string };
type AttendanceRow = { student_id: string; status_id: string };
type StudentRow = { id: string; name: string; parent_name: string | null; parent_phone: string | null; class_id: string };
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePakistanPhone(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (/^03\d{9}$/.test(digits)) return "92" + digits.slice(1);
  if (/^923\d{9}$/.test(digits)) return digits;
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "Authentication required" }, 401);

  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const graphVersion = Deno.env.get("WHATSAPP_GRAPH_API_VERSION");
  const absentTemplate = Deno.env.get("WHATSAPP_TEMPLATE_ABSENT");
  const leaveTemplate = Deno.env.get("WHATSAPP_TEMPLATE_LEAVE");
  if (!accessToken || !phoneNumberId || !graphVersion || !absentTemplate || !leaveTemplate) {
    return json({
      configured: false,
      sent: 0,
      failed: 0,
      error: "WhatsApp Cloud API is not configured. Add the five WhatsApp secrets in Supabase Edge Function secrets.",
      code: "WHATSAPP_NOT_CONFIGURED",
    });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const keys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const publishableKey = keys ? JSON.parse(keys).default : anonKey;
  if (!url || !publishableKey) return json({ error: "Supabase function environment is incomplete" }, 500);

  const supabase = createClient(url, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: "Invalid session" }, 401);
  const userId = authData.user.id;

  let body: { classId?: string; attendanceDate?: string; language?: 'en' | 'ur'; appName?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!body.classId || !/^\d{4}-\d{2}-\d{2}$/.test(body.attendanceDate || "")) {
    return json({ error: "classId and attendanceDate (YYYY-MM-DD) are required" }, 400);
  }

  const { data: classRow, error: classError } = await supabase
    .from("classes").select("id,name").eq("id", body.classId).eq("user_id", userId).maybeSingle();
  if (classError || !classRow) return json({ error: "Class not found or access denied" }, 404);

  const [{ data: records, error: recordsError }, { data: statuses, error: statusesError },
    { data: students, error: studentsError }, { data: userSettings }] = await Promise.all([
    supabase.from("attendance_records").select("student_id,status_id")
      .eq("user_id", userId).eq("class_id", body.classId).eq("attendance_date", body.attendanceDate),
    supabase.from("attendance_statuses").select("id,key").eq("user_id", userId),
    supabase.from("students").select("id,name,parent_name,parent_phone,class_id")
      .eq("user_id", userId).eq("class_id", body.classId).eq("is_archived", false),
    supabase.from("user_settings").select("language,app_display_name,message_template")
      .eq("user_id", userId).maybeSingle(),
  ]);

  if (recordsError || statusesError || studentsError) {
    return json({ error: recordsError?.message || statusesError?.message || studentsError?.message || "Unable to load attendance" }, 500);
  }

  const statusById = new Map((statuses || []).map((s: StatusRow) => [s.id, s.key]));
  const studentById = new Map((students || []).map((s: StudentRow) => [s.id, s]));
  const language: "en" | "ur" = body.language === "ur" ? "ur" : body.language === "en" ? "en" : userSettings?.language === "ur" ? "ur" : "en";
  const appName = body.appName?.trim() || userSettings?.app_display_name || "Hazri Book";
  const date = body.attendanceDate;
  const pending = (records || []).flatMap((record: AttendanceRow) => {
    const status = statusById.get(record.status_id);
    if (status !== "absent" && status !== "leave") return [];
    const student = studentById.get(record.student_id);
    const phone = normalizePakistanPhone(student?.parent_phone || null);
    if (!student || !phone) return [];
    return [{
      user_id: userId, student_id: student.id, class_id: body.classId!,
      attendance_date: date, status_key: status, phone_number: phone, language,
      delivery_status: "pending",
    }];
  });

  if (!pending.length) {
    const missingPhoneCount = (records || []).filter((r: AttendanceRow) => {
      const key = statusById.get(r.status_id);
      const student = studentById.get(r.student_id);
      return (key === "absent" || key === "leave") && !normalizePakistanPhone(student?.parent_phone || null);
    }).length;
    return json({ sent: 0, skipped: missingPhoneCount, message: "No eligible parent numbers for absent/leave attendance." });
  }

  const { data: newRows, error: insertError } = await supabase
    .from("parent_whatsapp_notifications")
    .upsert(pending, {
      onConflict: "user_id,student_id,attendance_date,status_key",
      ignoreDuplicates: true,
    })
    .select("id,student_id,status_key,phone_number,language");

  if (insertError) return json({ error: insertError.message }, 500);
  if (!newRows?.length) return json({ sent: 0, skipped: pending.length, duplicate: true });

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of newRows) {
    const templateName = row.status_key === "absent" ? absentTemplate : leaveTemplate;
    const languageCode = row.language === "ur" ? "ur" : "en_US";
    const student = studentById.get(row.student_id);
    const components = [{
      type: "body",
      parameters: [
        { type: "text", text: student?.name || "" },
        { type: "text", text: classRow.name },
        { type: "text", text: date },
        { type: "text", text: appName },
      ],
    }];

    try {
      const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: row.phone_number,
          type: "template",
          template: { name: templateName, language: { code: languageCode }, components },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message || `WhatsApp API returned ${response.status}`);
      const messageId = result?.messages?.[0]?.id || null;
      await supabase.from("parent_whatsapp_notifications")
        .update({ delivery_status: "sent", provider_message_id: messageId, sent_at: new Date().toISOString(), error_message: null })
        .eq("id", row.id).eq("user_id", userId);
      sent++;
    } catch (error) {
      const message = error instanceof Error ? error.message : "WhatsApp send failed";
      await supabase.from("parent_whatsapp_notifications")
        .update({ delivery_status: "failed", error_message: message })
        .eq("id", row.id).eq("user_id", userId);
      failed++;
      errors.push(message);
    }
  }

  return json({ sent, failed, skipped: Math.max(0, pending.length - newRows.length), errors });
});
