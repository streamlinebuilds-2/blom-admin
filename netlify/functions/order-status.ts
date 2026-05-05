import type { Handler } from '@netlify/functions'

function getWebhookUrl(): string {
  const direct = process.env.N8N_ORDER_STATUS_WEBHOOK
  const base = process.env.N8N_BASE
  if (direct) return direct
  if (base) return `${base.replace(/\/$/, '')}/webhook/notify-order`
  return 'https://dockerfile-1n82.onrender.com/webhook/notify-order'
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

    const body = event.body || '{}'
    let json: any
    try { json = JSON.parse(body) } catch { return { statusCode: 400, body: 'Invalid JSON' } }

    const { m_payment_id, status } = json
    if (!m_payment_id || !status) return { statusCode: 400, body: 'Missing required fields' }

    // 1. GENERATE INVOICE FIRST (If paid)
    // This ensures the public URL is ready in the DB before n8n grabs the order
    let invoiceGenerated = false
    if (status === 'paid') {
      try {
        console.log('Generating invoice before webhook:', m_payment_id)
        // Wait for invoice generation to complete
        await fetch(`${json.site_url || 'https://blom-cosmetics.co.za'}/.netlify/functions/invoice-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ m_payment_id })
        })
        invoiceGenerated = true
      } catch (err) {
        console.error('Invoice generation warning:', err)
      }
    }

    // 2. THEN TRIGGER WEBHOOK (n8n)
    // Now n8n will see the 'invoice_url' when it fetches the order
    const url = getWebhookUrl()
    const fwd = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    })

    console.log('Order status pipeline complete:', { m_payment_id, invoiceGenerated, webhookStatus: fwd.status })

    return { 
      statusCode: 200, 
      body: JSON.stringify({ success: true, invoice_generated: invoiceGenerated })
    }
  } catch (e: any) {
    console.error('Error:', e)
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) }
  }
}