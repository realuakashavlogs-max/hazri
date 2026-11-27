import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "Authentication required" }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const keys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const publishableKey = keys ? JSON.parse(keys).default : anonKey;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !publishableKey || !serviceKey) return json({ error: "Supabase function environment is incomplete" }, 500);
  const authClient = createClient(url, publishableKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Invalid session" }, 401);
  const userId = authData.user.id;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let body: { action?: string; code?: string; wabaId?: string; phoneNumberId?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  if (body.action === "config") {
    const appId = Deno.env.get("META_APP_ID") || "";
    const configId = Deno.env.get("META_WHATSAPP_CONFIG_ID") || "";
    return json({ configured: Boolean(appId && configId && Deno.env.get("META_APP_SECRET")), appId, configId });
  }
  if (body.action === "status") {
    const { data, error } = await admin.from("whatsapp_business_connections_private")
      .select("waba_id,phone_number_id,display_phone_number,verified_name,connected_at,token_expires_at")
      .eq("user_id", userId).maybeSingle();
    if (error) return json({ error: error.message }, 500);
    return json({ connected: Boolean(data), connection: data || null });
  }
  if (body.action === "disconnect") {
    const { error } = await admin.from("whatsapp_business_connections_private").delete().eq("user_id", userId);
    if (error) return json({ error: error.message }, 500);
    return json({ connected: false });
  }
  if (body.action !== "exchange") return json({ error: "Unsupported action" }, 400);
  const appId = Deno.env.get("META_APP_ID");
  const appSecret = Deno.env.get("META_APP_SECRET");
  const graphVersion = Deno.env.get("META_GRAPH_API_VERSION") || "v27.0";
  if (!appId || !appSecret) return json({ error: "Meta app credentials are not configured yet." }, 503);
  if (!body.code || !body.wabaId || !body.phoneNumberId) return json({ error: "Meta authorization code, WABA ID and phone number ID are required." }, 400);
  const exchangeUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
  exchangeUrl.searchParams.set("client_id", appId);
  exchangeUrl.searchParams.set("client_secret", appSecret);
  exchangeUrl.searchParams.set("code", body.code);
  const exchangeResponse = await fetch(exchangeUrl);
  const exchangeResult = await exchangeResponse.json();
  if (!exchangeResponse.ok || !exchangeResult.access_token) return json({ error: exchangeResult?.error?.message || "Meta authorization code could not be exchanged." }, 400);
  const token = String(exchangeResult.access_token);
  const phoneUrl = new URL(`https://graph.facebook.com/${graphVersion}/${body.phoneNumberId}`);
  phoneUrl.searchParams.set("fields", "display_phone_number,verified_name");
  const phoneResponse = await fetch(phoneUrl, { headers: { Authorization: `Bearer ${token}` } });
  const phoneInfo = await phoneResponse.json();
  if (!phoneResponse.ok) return json({ error: phoneInfo?.error?.message || "Could not verify the WhatsApp Business phone number." }, 400);
  const expiresAt = typeof exchangeResult.expires_in === "number" ? new Date(Date.now() + exchangeResult.expires_in * 1000).toISOString() : null;
  const { error: saveError } = await admin.from("whatsapp_business_connections_private").upsert({
    user_id: userId, waba_id: body.wabaId, phone_number_id: body.phoneNumberId,
    display_phone_number: phoneInfo.display_phone_number || null, verified_name: phoneInfo.verified_name || null,
    access_token: token, token_expires_at: expiresAt, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (saveError) return json({ error: saveError.message }, 500);
  return json({ connected: true, connection: { waba_id: body.wabaId, phone_number_id: body.phoneNumberId, display_phone_number: phoneInfo.display_phone_number || null, verified_name: phoneInfo.verified_name || null, token_expires_at: expiresAt } });
});