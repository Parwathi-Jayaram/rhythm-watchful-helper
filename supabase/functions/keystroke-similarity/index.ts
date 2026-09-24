import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  extractFeatures,
  computeSimilarity,
  updateBaseline,
  type KeystrokeFeatures,
  type BaselineProfile,
  type SimilarityResult,
  DEFAULT_CONFIG,
} from "./similarity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CalibrateRequest {
  keystrokeData: {
    events: Array<{ key: string; type: "down" | "up"; timestamp: number; pressure?: number }>;
    text: string;
  };
}

interface VerifyRequest {
  keystrokeData: {
    events: Array<{ key: string; type: "down" | "up"; timestamp: number; pressure?: number }>;
    text: string;
  };
}

interface RecalibrateRequest {
  keystrokeData: {
    events: Array<{ key: string; type: "down" | "up"; timestamp: number; pressure?: number }>;
    text: string;
  };
}

function getSupabaseClient(authHeader: string | null) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader || "" } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getUserFromToken(supabase: ReturnType<typeof createClient>, token: string) {
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new Error("Invalid or expired session");
  }
  return data.user;
}

async function getLatestBaseline(supabase: ReturnType<typeof createClient>, userId: string): Promise<BaselineProfile | null> {
  const { data, error } = await supabase
    .from("typing_baselines")
    .select("baseline_features, calibration_date")
    .eq("user_id", userId)
    .order("calibration_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    features: data.baseline_features as KeystrokeFeatures,
    createdAt: data.calibration_date,
    version: 1,
  };
}

async function saveBaseline(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  features: KeystrokeFeatures,
  calibrationDate: string = new Date().toISOString()
) {
  const { data, error } = await supabase
    .from("typing_baselines")
    .insert({
      user_id: userId,
      baseline_features: features,
      calibration_date: calibrationDate,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

async function logAttempt(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  similarityScore: number,
  success: boolean,
  deviceInfo?: Record<string, unknown>
) {
  const { error } = await supabase.from("login_attempts").insert({
    user_id: userId,
    similarity_score: similarityScore,
    success,
    timestamp: new Date().toISOString(),
    device_info: deviceInfo || {},
  });
  if (error) console.error("Failed to log attempt:", error);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = getSupabaseClient(authHeader);
  const token = authHeader.replace("Bearer ", "");
  let user;

  try {
    user = await getUserFromToken(supabase, token);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    if (path.endsWith("/calibrate") && req.method === "POST") {
      const body: CalibrateRequest = await req.json();
      const features = extractFeatures(body.keystrokeData);

      if (features.dwellTimes.length < DEFAULT_CONFIG.minSamples) {
        return new Response(
          JSON.stringify({ error: "Insufficient keystroke data for calibration" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const baselineId = await saveBaseline(supabase, user.id, features);

      return new Response(
        JSON.stringify({
          success: true,
          baseline_id: baselineId,
          features: {
            dwell_count: features.dwellTimes.length,
            flight_count: features.flightTimes.length,
            typing_speed: features.typingSpeed,
          },
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path.endsWith("/verify") && req.method === "POST") {
      const body: VerifyRequest = await req.json();
      const features = extractFeatures(body.keystrokeData);

      const baseline = await getLatestBaseline(supabase, user.id);
      if (!baseline) {
        return new Response(
          JSON.stringify({ error: "No baseline found. Please calibrate first." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result: SimilarityResult = computeSimilarity(baseline, features);

      await logAttempt(supabase, user.id, result.score, result.passed, {
        user_agent: req.headers.get("user-agent"),
        endpoint: "verify",
      });

      return new Response(
        JSON.stringify({
          similarity_score: result.score,
          passed: result.passed,
          threshold: result.threshold,
          details: result.details,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path.endsWith("/recalibrate") && req.method === "POST") {
      const body: RecalibrateRequest = await req.json();
      const features = extractFeatures(body.keystrokeData);

      const baseline = await getLatestBaseline(supabase, user.id);
      if (!baseline) {
        return new Response(
          JSON.stringify({ error: "No baseline found. Please calibrate first." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updatedBaseline = updateBaseline(baseline, features);
      const baselineId = await saveBaseline(
        supabase,
        user.id,
        updatedBaseline.features,
        updatedBaseline.createdAt
      );

      return new Response(
        JSON.stringify({
          success: true,
          baseline_id: baselineId,
          version: updatedBaseline.version,
          features: {
            dwell_count: updatedBaseline.features.dwellTimes.length,
            flight_count: updatedBaseline.features.flightTimes.length,
            typing_speed: updatedBaseline.features.typingSpeed,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path.endsWith("/profile") && req.method === "GET") {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, created_at")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw new Error(profileError.message);

      const { data: baseline, error: baselineError } = await supabase
        .from("typing_baselines")
        .select("id, calibration_date, created_at")
        .eq("user_id", user.id)
        .order("calibration_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (baselineError) throw new Error(baselineError.message);

      const { data: attempts, error: attemptsError } = await supabase
        .from("login_attempts")
        .select("similarity_score, success, timestamp")
        .eq("user_id", user.id)
        .order("timestamp", { ascending: false })
        .limit(10);

      if (attemptsError) throw new Error(attemptsError.message);

      return new Response(
        JSON.stringify({
          user: {
            id: user.id,
            email: user.email,
            created_at: profile?.created_at,
          },
          baseline: baseline
            ? {
                id: baseline.id,
                calibration_date: baseline.calibration_date,
                created_at: baseline.created_at,
              }
            : null,
          recent_attempts: attempts || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});