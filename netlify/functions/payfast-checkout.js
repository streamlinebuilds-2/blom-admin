import crypto from "crypto";
import querystring from "querystring";

function sign(fields, passphrase) {
  const pairs = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, "+")}`)
    .sort(); // alphabetical
  let str = pairs.join("&");
  if (passphrase) str += `&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}`;
  return crypto.createHash("md5").update(str).digest("hex");
}

export const handler = async (event) => {
  try {
    const pfBase = process.env.PAYFAST_BASE;
    const returnUrl = process.env.PAYFAST_RETURN_URL;
    const cancelUrl = process.env.PAYFAST_CANCEL_URL;
    const notifyUrl = process.env.PAYFAST_NOTIFY_URL;
    const merchantId = process.env.PAYFAST_MERCHANT_ID;
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
    const passphrase = process.env.PAYFAST_PASSPHRASE;

    // Hard fail if critical envs are missing
    const missing = [
      ["PAYFAST_BASE", pfBase],
      ["PAYFAST_RETURN_URL", returnUrl],
      ["PAYFAST_CANCEL_URL", cancelUrl],
      ["PAYFAST_NOTIFY_URL", notifyUrl],
      ["PAYFAST_MERCHANT_ID", merchantId],
      ["PAYFAST_MERCHANT_KEY", merchantKey],
    ].filter(([, v]) => !v);
    if (missing.length) {
      console.error("Missing envs:", missing.map(([k]) => k).join(", "));
      return {
        statusCode: 500,
        body: `Missing envs: ${missing.map(([k]) => k).join(", ")}`,
      };
    }

    const debugMode = (event.queryStringParameters || {}).debug === "1";

    const {
      m_payment_id,
      amount,
      name_first,
      name_last,
      email_address,
      item_name = "BLOM Order",
      order_id,
    } = JSON.parse(event.body || "{}");

    const fields = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,
      m_payment_id,
      amount: Number(amount).toFixed(2),
      item_name,
      name_first,
      name_last,
      email_address,
      custom_str1: order_id,
    };

    const signature = sign(fields, passphrase);
    const qs = querystring.stringify({ ...fields, signature });
    const redirect = `${pfBase}?${qs}`;

    if (debugMode) {
      // Show exactly what we're sending (mask key slightly)
      return {
        statusCode: 200,
        body: JSON.stringify({
          sending_fields: { ...fields, merchant_key: merchantKey?.slice(0,3) + "***" },
          redirect,
        }),
      };
    }

    return { statusCode: 200, body: JSON.stringify({ redirect }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: e.message };
  }
};

