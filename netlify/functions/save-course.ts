import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: "Method Not Allowed" }) };
    }
    if (!event.body) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Empty body" }) };
    }

    let body: any;
    try {
      body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: "Invalid JSON: " + (e instanceof Error ? e.message : String(e)) }),
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: "Server not configured" }) };
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const id = body.id ?? null;
    const title = String(body.title || "").trim();
    const slug = String(body.slug || "").trim();
    const courseType = String(body.course_type || "in-person").trim();
    const instructorName = String(body.instructor_name || "").trim();

    if (!title) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Title is required" }) };
    }
    if (!slug) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Slug is required" }) };
    }
    if (courseType !== "online" && courseType !== "in-person") {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Course Type is required" }) };
    }
    if (!instructorName) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Instructor Name is required" }) };
    }

    const payload: any = {
      title,
      slug,
      description: body.description ?? null,
      price: body.price === "" || body.price == null ? null : Number(body.price),
      image_url: body.image_url ?? null,
      duration: body.duration ?? null,
      level: body.level ?? null,
      template_key: body.template_key ?? null,
      course_type: courseType,
      instructor_name: instructorName,
      instructor_bio: body.instructor_bio ?? null,
      is_active: body.is_active !== false,
    };

    if (id) {
      const { data, error } = await admin
        .from("courses")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: `DB error: ${error.message}` }) };
      }

      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, course: data }) };
    }

    const { data, error } = await admin.from("courses").insert([payload]).select("*").single();
    if (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: `DB error: ${error.message}` }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, course: data }) };
  } catch (err: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err?.message || "Save failed" }) };
  }
};
