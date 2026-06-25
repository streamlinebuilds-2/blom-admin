import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" })
    };
  }

  try {
    const url = new URL(e.rawUrl);
    const page = Number(url.searchParams.get("page") || 1);
    const pageSize = Number(url.searchParams.get("pageSize") || 20);
    const courseSlug = url.searchParams.get("course_slug");
    const buyerEmail = url.searchParams.get("buyer_email");
    const invitationStatus = url.searchParams.get("invitation_status");
    const createdFrom = url.searchParams.get("created_from");
    const createdTo = url.searchParams.get("created_to");
    const invitedFrom = url.searchParams.get("invited_from");
    const invitedTo = url.searchParams.get("invited_to");
    const hidePending = url.searchParams.get("hide_pending") === "true";

    // When hiding pending, fetch a larger batch without pagination so we can
    // filter by computed booking_status before slicing for the requested page.
    const fetchAll = hidePending;
    const from = fetchAll ? 0 : (page - 1) * pageSize;
    const to = fetchAll ? 999 : from + pageSize - 1;

    let query = s.from("course_purchases")
      .select(`*, orders:order_id (invoice_url, status, payment_status, paid_at)`, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (courseSlug) query = query.eq("course_slug", courseSlug);
    if (buyerEmail) query = query.ilike("buyer_email", `%${buyerEmail}%`);
    if (invitationStatus) query = query.eq("invitation_status", invitationStatus);
    if (createdFrom) query = query.gte("created_at", createdFrom);
    if (createdTo) query = query.lte("created_at", createdTo);
    if (invitedFrom) query = query.gte("invited_at", invitedFrom);
    if (invitedTo) query = query.lte("invited_at", invitedTo);

    const { data, error } = await query;
    if (error) throw error;

    // Compute booking_status for each row
    const allItems = (data || []).map((item: any) => {
      const orderPaid =
        item?.orders?.payment_status === "paid" ||
        item?.orders?.status === "paid" ||
        !!item?.orders?.paid_at;

      const bookingStatus =
        item?.course_type === "in-person" && orderPaid
          ? "deposit_paid"
          : orderPaid
            ? "paid"
            : (item?.invitation_status || "pending");

      return {
        ...item,
        invoice_url: item.orders?.invoice_url || null,
        booking_status: bookingStatus,
        orders: undefined
      };
    });

    // Filter and paginate in JS when hiding pending
    const filtered = hidePending
      ? allItems.filter((i: any) => i.booking_status === "paid" || i.booking_status === "deposit_paid")
      : allItems;

    const total = filtered.length;
    const pageStart = (page - 1) * pageSize;
    const items = hidePending ? filtered.slice(pageStart, pageStart + pageSize) : filtered;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        items,
        total,
        page,
        pageSize
      })
    };
  } catch (err: any) {
    console.error("Error in admin-course-purchases:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, error: err.message || String(err) })
    };
  }
};
