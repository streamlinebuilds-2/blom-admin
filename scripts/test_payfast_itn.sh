#!/bin/bash

# FAKE PAYFAST ITN TEST - Order BL-MIJA07IB
# This simulates PayFast sending a payment confirmation to your webhook

echo "🧪 Testing PayFast ITN with order BL-MIJA07IB..."
echo "📡 Sending fake payment confirmation..."
echo ""

# Read the JSON payload from file and send it
curl -X POST "https://blom-cosmetics.co.za/.netlify/functions/payfast-itn" \
  -H "Content-Type: application/json" \
  -H "User-Agent: PayFast/2.0 (Test Mode)" \
  -H "X-PayFast-Source: ITN" \
  -d '{
    "merchant_id": "10000100",
    "merchant_key": "46f0cd694581a",
    "payment_status": "COMPLETE",
    "item_name": "Test Order BL-MIJA07IB",
    "item_description": "Order from BLOM Cosmetics",
    "name_first": "Test",
    "name_last": "Customer",
    "email_address": "test@example.com",
    "m_payment_id": "BL-MIJA07IB",
    "custom_str1": "BL-MIJA07IB",
    "custom_str2": "web_order",
    "amount_gross": "250.00",
    "amount_fee": "-5.00",
    "amount_net": "245.00",
    "recurring": "",
    "frequency": "",
    "cycles": "",
    "signature": "fake_signature_for_testing",
    "pgn": "PayFast",
    "pga": "2.0",
    "pfx_merchant_key": "46f0cd694581a",
    "pfx_merchant_id": "10000100",
    "pfx_device_id": "10000100-test",
    "pfx_timestamp": "20251128T214500Z",
    "pfx_digest": "fake_digest_for_testing",
    "address_line_1": "123 Test Street",
    "address_city": "Cape Town",
    "address_state": "Western Cape",
    "address_zip": "8001",
    "address_country": "ZA",
    "phone": "0211234567",
    "cell_number": "0821234567",
    "currency": "ZAR",
    "return_url": "https://blom-cosmetics.co.za/checkout/success",
    "cancel_url": "https://blom-cosmetics.co.za/checkout/cancel",
    "notify_url": "https://blom-cosmetics.co.za/.netlify/functions/payfast-itn",
    "custom_str3": "placed_to_paid_test",
    "timestamp": "2025-11-28T21:45:00Z",
    "source": "payfast_itn",
    "test_mode": true
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -v

echo ""
echo "✅ ITN test sent!"
echo ""
echo "🔍 To check if the order status was updated:"
echo "SELECT order_number, status, updated_at, paid_at FROM orders WHERE order_number = 'BL-MIJA07IB';"
echo ""
echo "📊 Expected flow:"
echo "1. Order status changes from 'placed' to 'paid'"
echo "2. paid_at timestamp is set"
echo "3. Order becomes eligible for 'Mark as Packed' button"