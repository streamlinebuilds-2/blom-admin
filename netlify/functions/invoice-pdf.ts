import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import fetch from "node-fetch"

const SUPABASE_URL = process.env.SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SITE = process.env.SITE_BASE_URL || process.env.SITE_URL || "https://blom-cosmetics.co.za"
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

async function fetchJson(url: string) {
  const res = await fetch(url, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const handler = async (event: any) => {
  try {
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

    // ID Lookup logic
    if (!m_payment_id && order_id) {
      try {
        const orderResponse: any = await fetchJson(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order_id}&select=m_payment_id`);
        if (orderResponse && orderResponse.length > 0) m_payment_id = orderResponse[0].m_payment_id;
      } catch (error) { console.error('ID Lookup Error', error); }
    }

    if (!m_payment_id) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'ID required' }) };
    }

    // 1) Load Order Data
    const orderResponse: any = await fetchJson(
      `${SUPABASE_URL}/rest/v1/orders?m_payment_id=eq.${encodeURIComponent(m_payment_id)}&select=id,buyer_name,buyer_email,buyer_phone,fulfillment_method,delivery_address,collection_location,total,subtotal_cents,shipping_cents,discount_cents,coupon_code,status,created_at`
    )
    const order = Array.isArray(orderResponse) ? orderResponse[0] : orderResponse
    if (!order) return { statusCode: 404, body: "ORDER_NOT_FOUND" }

    const items = await fetchJson(
      `${SUPABASE_URL}/rest/v1/order_items?order_id=eq.${order.id}&select=product_name,sku,quantity,unit_price,line_total,variant_title`
    ) as any[]

    // Calculate totals
    const itemsSum = items.reduce((s: number, it: any) => s + (Number(it.quantity || 0) * Number(it.unit_price || 0)), 0)
    order.total = Number(order.total) > 0 ? Number(order.total) : itemsSum

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
    drawText(order.buyer_name || "-", left, y, 11)
    drawText(String(order.fulfillment_method || '-').toUpperCase(), right - 200, y, 11)
    y += 16
    drawText(order.buyer_email || "-", left, y, 10, false, rgb(0.4, 0.45, 0.52))
    if (order.collection_location) drawText(String(order.collection_location), right - 200, y, 10, false, rgb(0.4, 0.45, 0.52))
    y += 16
    drawText(order.buyer_phone || "", left, y, 10, false, rgb(0.4, 0.45, 0.52))
    
    if (order.delivery_address && order.fulfillment_method === 'delivery') {
      const addr = order.delivery_address
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
    items.forEach((it: any, index: number) => {
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

      const name = it.product_name || it.sku || "-"
      const variant = it.variant_title ? ` • ${it.variant_title}` : ""
      const qty = Number(it.quantity || 0)
      const unit = Number(it.unit_price || 0)
      const lineTotal = it.line_total ? Number(it.line_total) : (qty * unit)

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
    let shippingAmount = Number(order.shipping_cents ?? 0) / 100
    // Allow overriding shipping via query param (e.g. ?shipping=120)
    if (q.shipping) {
      shippingAmount = Number(q.shipping)
    }

    const subtotalAmount = order.subtotal_cents != null ? order.subtotal_cents / 100 : itemsSum
    const discountAmount = Number(order.discount_cents ?? 0) / 100

    // Only show discount line when there is a real explicit discount
    const showDiscount = discountAmount > 0.0001

    // Shipping line
    const isFreeShipping = subtotalAmount >= 2000 && shippingAmount === 0 && !q.shipping
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
      drawRightText("-" + money(discountAmount), right - 20, y, 10, false, rgb(0.5, 0.5, 0.2)) // Fixed color param
      y += ITEM_ROW_HEIGHT
    }

    y += 10
    drawLine(left, y, right, y)
    y += 20

    // Prefer stored order.total (what was paid); otherwise use calculated total
    // IF shipping was manually overridden, we MUST use the calculated total to reflect that change
    const calculatedTotal = Math.max(0, subtotalAmount + shippingAmount - discountAmount)
    const finalTotal = q.shipping ? calculatedTotal : (Number(order.total) > 0 ? Number(order.total) : calculatedTotal)

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
    
    await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(filename)}`, {
      method: "POST",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/pdf", "x-upsert": "true" },
      body: Buffer.from(pdfBytes)
    })

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(filename)}`
    
    // Update Order Invoice URL
    await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order.id}`, {
      method: "PATCH",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ invoice_url: publicUrl })
    })

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
