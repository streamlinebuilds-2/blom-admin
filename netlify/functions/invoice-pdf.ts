import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import fetch from "node-fetch"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SITE = process.env.SITE_BASE_URL || process.env.PUBLIC_SITE_URL || "https://blom-cosmetics.co.za"
const BUCKET = "invoices"
const LOGO_URL = "https://yvmnedjybrpvlupygusf.supabase.co/storage/v1/object/public/assets/blom_logo.png"

// Page dimensions (A4)
const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const ITEMS_PER_PAGE = 25 // Adjust based on your needs
const ITEM_ROW_HEIGHT = 16
const FOOTER_HEIGHT = 60 // Space needed for totals and footer

function money(n: any) {
  return "R " + Number(n || 0).toFixed(2)
}

function safeParseJson(value: any) {
  if (value == null) return null
  if (typeof value === "object") return value
  if (typeof value !== "string") return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function toNumberLoose(value: any): number {
  if (value === undefined || value === null) return Number.NaN
  if (typeof value === "number") return value
  if (typeof value !== "string") return Number.NaN
  const cleaned = value.replace(/,/g, "").replace(/[^\d.-]/g, "").trim()
  if (!cleaned) return Number.NaN
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : Number.NaN
}

export const handler = async (event: any) => {
  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return { statusCode: 500, body: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }
    }

    const contentType = event.headers['content-type'] || '';
    let body: any = {};

    if (event.httpMethod === 'GET') {
      body = {};
    } else if (contentType.includes('application/json')) {
      body = event.body ? JSON.parse(event.body) : {};
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      body = Object.fromEntries(new URLSearchParams(event.body || ''));
    } else {
      try { body = event.body ? JSON.parse(event.body) : {}; } catch { body = {}; }
    }

    const q = event.queryStringParameters || {};
    let m_payment_id = body.m_payment_id || q.m_payment_id || event.headers['x-m-payment-id'];
    const order_id = body.order_id || q.order_id || event.headers['x-order-id'];

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
      global: { fetch: fetch as any }
    })

    if (!m_payment_id && order_id) {
      const { data: idRow, error: idErr } = await supabase
        .from("orders")
        .select("m_payment_id")
        .eq("id", order_id)
        .maybeSingle()
      if (!idErr && idRow?.m_payment_id) m_payment_id = idRow.m_payment_id
    }

    if (!m_payment_id) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'ID required' }) };
    }

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("m_payment_id", m_payment_id)
      .maybeSingle()

    if (orderErr) return { statusCode: 500, body: orderErr.message }
    if (!order) return { statusCode: 404, body: "ORDER_NOT_FOUND" }

    const { data: rawItems, error: itemsErr } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id)

    if (itemsErr) return { statusCode: 500, body: itemsErr.message }
    const items = rawItems || []

    const unitFromItem = (it: any) => {
      const cents = it.unit_price_cents != null ? toNumberLoose(it.unit_price_cents) : Number.NaN
      if (Number.isFinite(cents) && cents > 0) return cents / 100
      const unit = it.unit_price != null ? toNumberLoose(it.unit_price) : Number.NaN
      if (Number.isFinite(unit) && unit > 0) return unit
      const price = it.price != null ? toNumberLoose(it.price) : Number.NaN
      if (Number.isFinite(price) && price > 0) return price
      return null
    }

    const lineFromItem = (it: any) => {
      const cents = it.line_total_cents != null ? toNumberLoose(it.line_total_cents) : Number.NaN
      if (Number.isFinite(cents) && cents > 0) return cents / 100
      const line = it.line_total != null ? toNumberLoose(it.line_total) : Number.NaN
      if (Number.isFinite(line) && line > 0) return line
      return null
    }

    const missingPriceIds = Array.from(
      new Set(
        items
          .filter((it: any) => unitFromItem(it) == null && it.product_id)
          .map((it: any) => it.product_id)
      )
    )

    const productById = new Map<string, any>()
    if (missingPriceIds.length) {
      const { data: products, error: pErr } = await supabase
        .from("products")
        .select("id, price_cents, price, variants")
        .in("id", missingPriceIds)
      if (!pErr && products?.length) {
        products.forEach((p: any) => productById.set(p.id, p))
      }
    }

    const unitFromProduct = (it: any) => {
      if (!it.product_id) return null
      const p = productById.get(it.product_id)
      if (!p) return null
      const variants = safeParseJson(p.variants) || p.variants
      if (variants && it.variant_index !== undefined && it.variant_index !== null && Array.isArray(variants)) {
        const v = variants[it.variant_index]
        const cents = v?.price_cents != null ? toNumberLoose(v.price_cents) : Number.NaN
        if (Number.isFinite(cents) && cents > 0) return cents / 100
        const price = v?.price != null ? toNumberLoose(v.price) : Number.NaN
        if (Number.isFinite(price) && price > 0) return price
      }
      const cents = p.price_cents != null ? toNumberLoose(p.price_cents) : Number.NaN
      if (Number.isFinite(cents) && cents > 0) return cents / 100
      const price = p.price != null ? toNumberLoose(p.price) : Number.NaN
      if (Number.isFinite(price) && price > 0) return price
      return null
    }

    const normalizedItems = items.map((it: any) => {
      const qty = Number(it.quantity ?? it.qty ?? 0) || 0
      const unit = unitFromItem(it) ?? unitFromProduct(it) ?? 0
      const lineTotal = lineFromItem(it) ?? (unit * qty)

      return {
        name: it.name || it.product_name || it.sku || "-",
        variant: it.variant || it.variant_title || "",
        sku: it.sku || "",
        quantity: qty,
        unit_price: unit,
        line_total: lineTotal
      }
    })

    const itemsSum = normalizedItems.reduce((s: number, it: any) => s + Number(it.line_total || 0), 0)

    // 2) PDF Generation
    const pdf = await PDFDocument.create()
    let currentPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    let pageNum = 1
    const left = 40
    const right = PAGE_WIDTH - 40

    const font = await pdf.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

    // Helper functions
    const drawText = (text: string, x: number, yPos: number, size = 12, bold = false, color = rgb(0.1, 0.1, 0.15), page = currentPage) => {
      page.drawText(String(text), { x, y: PAGE_HEIGHT - yPos, size, font: bold ? fontBold : font, color })
    }
    const drawLine = (x1: number, y1: number, x2: number, y2: number, page = currentPage) => {
      page.drawLine({ start: { x: x1, y: PAGE_HEIGHT - y1 }, end: { x: x2, y: PAGE_HEIGHT - y2 }, thickness: 1, color: rgb(0.9, 0.92, 0.95) })
    }
    const drawRightText = (text: string, x: number, yPos: number, size = 12, bold = false, color = rgb(0.1, 0.1, 0.15), page = currentPage) => {
      const textWidth = (bold ? fontBold : font).widthOfTextAtSize(String(text), size)
      page.drawText(String(text), { x: x - textWidth, y: PAGE_HEIGHT - yPos, size, font: bold ? fontBold : font, color })
    }

    // Function to add a new page
    const addNewPage = () => {
      currentPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      pageNum++
      // Add page number
      drawText(`Page ${pageNum}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 20, 8, false, rgb(0.5, 0.5, 0.5), currentPage)
      return 20 // Return starting Y position for new page
    }

    // Function to check if we need a new page
    const checkPageBreak = (currentY: number, neededSpace: number) => {
      if (currentY + neededSpace > PAGE_HEIGHT - FOOTER_HEIGHT) {
        return addNewPage()
      }
      return currentY
    }

    let y = 20

    // Add Logo (only on first page)
    let logoHeight = 0
    try {
      const logoRes = await fetch(LOGO_URL)
      if (logoRes.ok) {
        const logoBuf = await logoRes.arrayBuffer()
        const logoImg = await pdf.embedPng(logoBuf).catch(() => pdf.embedJpg(logoBuf))
        if (logoImg) {
          const logoW = 140
          logoHeight = (logoImg.height / logoImg.width) * logoW
          currentPage.drawImage(logoImg, { x: right - logoW, y: PAGE_HEIGHT - y - logoHeight, width: logoW, height: logoHeight })
        }
      }
    } catch (e) {}

    // Header Details (first page only)
    y = Math.max(20, logoHeight > 0 ? logoHeight + 10 : 20)
    drawText("RECEIPT", left, y, 24, true)
    y += 26
    drawText(`Receipt #: ${m_payment_id}`, left, y, 10, false, rgb(0.35, 0.38, 0.45))
    y += 16
    drawText(`Date: ${new Date(order.created_at).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}`, left, y, 10, false, rgb(0.35, 0.38, 0.45))
    y += 20
    
    drawLine(left, y, right, y)
    y += 22

    // Customer Info (first page only)
    drawText("Customer", left, y, 12, true)
    drawText("Fulfillment", right - 200, y, 12, true)
    y += 18
    const buyerName = order.buyer_name || order.customer_name || "-"
    const buyerEmail = order.buyer_email || order.customer_email || "-"
    const buyerPhone = order.contact_phone || order.buyer_phone || order.customer_phone || ""
    const fulfillment = order.fulfillment_method || order.delivery_method || order.fulfillment_type || order.shipping_method || "-"
    drawText(buyerName, left, y, 11)
    drawText(String(fulfillment || "-").toUpperCase(), right - 200, y, 11)
    y += 16
    drawText(buyerEmail, left, y, 10, false, rgb(0.4, 0.45, 0.52))
    if (order.collection_location) drawText(String(order.collection_location), right - 200, y, 10, false, rgb(0.4, 0.45, 0.52))
    y += 16
    drawText(buyerPhone, left, y, 10, false, rgb(0.4, 0.45, 0.52))
    
    const addrRaw = order.shipping_address ?? order.delivery_address ?? order.delivery_address_json
    const addrObj = safeParseJson(addrRaw) || addrRaw
    if (addrObj && String(fulfillment).toLowerCase().includes("delivery")) {
      const addr = addrObj
      const addrLines = [
        addr.line1 || addr.street_address,
        [addr.city, addr.postal_code || addr.code].filter(Boolean).join(' '),
        [addr.province, addr.country].filter(Boolean).join(', ')
      ].filter(Boolean)
      let addrY = y
      addrLines.forEach((line: string) => {
        drawText(line, right - 200, addrY, 9, false, rgb(0.4, 0.45, 0.52)); addrY += 13
      })
      y = Math.max(y, addrY + 4)
    }
    
    y += 16
    drawLine(left, y, right, y)
    y += 22

    // Items Table Header
    drawText("Item", left, y, 11, true)
    drawRightText("Qty", right - 150, y, 11, true)
    drawRightText("Unit", right - 90, y, 11, true)
    drawRightText("Total", right - 20, y, 11, true)
    y += 12
    drawLine(left, y, right, y)
    y += 16

    // Items Table with Pagination
    normalizedItems.forEach((it: any) => {
      // Check if we need a new page before drawing the item
      y = checkPageBreak(y, ITEM_ROW_HEIGHT + 5)

      // If we're on a new page, redraw the table header
      if (pageNum > 1 && y === 20) {
        drawText("Item", left, y, 11, true)
        drawRightText("Qty", right - 150, y, 11, true)
        drawRightText("Unit", right - 90, y, 11, true)
        drawRightText("Total", right - 20, y, 11, true)
        y += 12
        drawLine(left, y, right, y)
        y += 16
      }

      const name = it.name || it.sku || "-"
      const variant = it.variant ? ` • ${it.variant}` : ""
      const qty = Number(it.quantity || 0)
      const unit = Number(it.unit_price || 0)
      const lineTotal = Number(it.line_total || 0)

      // Truncate long product names to fit on one line
      const maxNameWidth = right - 180
      let displayName = name + variant
      const nameWidth = font.widthOfTextAtSize(displayName, 10)
      if (nameWidth > maxNameWidth) {
        // Truncate and add ellipsis
        let truncated = displayName
        while (font.widthOfTextAtSize(truncated + "...", 10) > maxNameWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1)
        }
        displayName = truncated + "..."
      }

      drawText(displayName, left, y, 10)
      drawRightText(String(qty), right - 150, y, 10)
      drawRightText(money(unit), right - 90, y, 10)
      drawRightText(money(lineTotal), right - 20, y, 10)
      y += ITEM_ROW_HEIGHT
    })

    // Ensure we have enough space for totals section
    y = checkPageBreak(y, FOOTER_HEIGHT)

    // If we moved to a new page, add a separator line
    if (pageNum > 1 && y === 20) {
      y = 40
    }

    // Calculate totals — only use explicit DB values, never infer discount
    const shippingAmount = toNumberLoose(order.shipping_cents ?? 0) / 100
    const subtotalAmount = order.subtotal_cents != null ? toNumberLoose(order.subtotal_cents) / 100 : itemsSum
    const discountAmount = toNumberLoose(order.discount_cents ?? 0) / 100
    const taxAmount = toNumberLoose(order.tax_cents ?? order.vat_cents ?? 0) / 100

    // Only show discount line when there is a real explicit discount
    const showDiscount = discountAmount > 0.0001

    // Shipping line
    const isFreeShipping = subtotalAmount >= 2000 && shippingAmount === 0
    if (isFreeShipping) {
      y = checkPageBreak(y, ITEM_ROW_HEIGHT)
      drawText("FREE SHIPPING - Order over R2000", left, y, 10)
      drawRightText("R 0.00", right - 20, y, 10)
      y += ITEM_ROW_HEIGHT
    } else if (shippingAmount > 0) {
      y = checkPageBreak(y, ITEM_ROW_HEIGHT)
      drawText("Shipping & Handling", left, y, 10)
      drawRightText("1", right - 150, y, 10)
      drawRightText(money(shippingAmount), right - 90, y, 10)
      drawRightText(money(shippingAmount), right - 20, y, 10)
      y += ITEM_ROW_HEIGHT
    }

    // Discount line — only when there is an explicit discount
    if (showDiscount) {
      y = checkPageBreak(y, ITEM_ROW_HEIGHT)
      const label = order.coupon_code ? `Coupon Discount (${order.coupon_code})` : "Coupon Discount"
      drawText(label, left, y, 10, false, rgb(0, 0.5, 0.2))
      drawRightText("-" + money(discountAmount), right - 20, y, 10, false, rgb(0, 0.5, 0.2))
      y += ITEM_ROW_HEIGHT
    }

    if (taxAmount > 0.0001) {
      y = checkPageBreak(y, ITEM_ROW_HEIGHT)
      drawText("Tax", left, y, 10)
      drawRightText(money(taxAmount), right - 20, y, 10)
      y += ITEM_ROW_HEIGHT
    }

    y += 10
    drawLine(left, y, right, y)
    y += 20

    // Prefer stored order.total (what was paid); otherwise use calculated total
    const calculatedTotal = Math.max(0, subtotalAmount + shippingAmount - discountAmount + taxAmount)
    const totalCentsRaw = toNumberLoose(order.total_cents ?? Number.NaN)
    const totalRandsRaw = toNumberLoose(order.total ?? Number.NaN)
    const finalTotal =
      Number.isFinite(totalCentsRaw) && totalCentsRaw > 0
        ? totalCentsRaw / 100
        : Number.isFinite(totalRandsRaw) && totalRandsRaw > 0
          ? totalRandsRaw
          : calculatedTotal

    // Subtotal
    drawRightText("Subtotal", right - 140, y, 10, false, rgb(0.4, 0.4, 0.45))
    drawRightText(money(subtotalAmount), right - 20, y, 10)
    y += 18

    // Total row
    drawLine(right - 250, y - 2, right, y - 2)
    drawText("Total", right - 140, y, 13, true)
    drawRightText(money(finalTotal), right - 20, y, 13, true)

    // Footer (only on last page)
    y += 35
    y = checkPageBreak(y, 40)
    drawLine(left, y, right, y)
    y += 18
    drawText("Thank you for your purchase!", left, y, 10, false, rgb(0.35, 0.38, 0.45))
    y += 14
    drawText("Questions? Contact us: shopblomcosmetics@gmail.com | +27 79 548 3317", left, y, 9, false, rgb(0.4, 0.45, 0.52))
    drawRightText(SITE.replace(/^https?:\/\//, ""), right, y, 9, false, rgb(0.4, 0.45, 0.52))

    // Add page numbers to all pages
    const pages = pdf.getPages()
    pages.forEach((page, index) => {
      const pageY = PAGE_HEIGHT - 20
      const pageX = PAGE_WIDTH / 2
      page.drawText(`Page ${index + 1}`, { 
        x: pageX - (font.widthOfTextAtSize(`Page ${index + 1}`, 8) / 2), 
        y: pageY, 
        size: 8, 
        font, 
        color: rgb(0.5, 0.5, 0.5) 
      })
    })

    const pdfBytes = await pdf.save()
    const version = q.v || Date.now().toString()
    const filename = `${m_payment_id}-${version}.pdf`
    
    const uploadRes = await supabase.storage
      .from(BUCKET)
      .upload(filename, Buffer.from(pdfBytes), { upsert: true, contentType: "application/pdf" })

    if (uploadRes.error) return { statusCode: 500, body: uploadRes.error.message }

    const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(filename).data.publicUrl

    const { error: upErr } = await supabase
      .from("orders")
      .update({ invoice_url: publicUrl })
      .eq("id", order.id)

    if (upErr) return { statusCode: 500, body: upErr.message }

    const disposition = (q.download === '1' || body.download === true) ? 'attachment' : 'inline'
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="Invoice-${m_payment_id}.pdf"`,
        'Cache-Control': 'public, max-age=3600'
      },
      body: Buffer.from(pdfBytes).toString('base64'),
      isBase64Encoded: true
    }
  } catch (e: any) {
    return { statusCode: 500, body: e?.message ?? "Error" }
  }
}
