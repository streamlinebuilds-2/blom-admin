import crypto from "crypto";
import querystring from "querystring";

const pfBase = process.env.PAYFAST_BASE;                  // you already have this
const returnUrl = process.env.PAYFAST_RETURN_URL;         // add in Netlify
const cancelUrl = process.env.PAYFAST_CANCEL_URL;         // add in Netlify
const notifyUrl = process.env.PAYFAST_NOTIFY_URL;         // add in Netlify

function sign(fields, passphrase) {
  const pairs = Object.entries(fields)
    .filter(([,v]) => v !== undefined && v !== null && v !== "")
    .map(([k,v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, "+")}`)
    .sort();
  let str = pairs.join("&");
  if (passphrase) str += `&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}`;
  return crypto.createHash("md5").update(str).digest("hex");
}

export const handler = async (event) => {
  try {
    const { m_payment_id, amount, name_first, name_last, email_address, item_name = "BLOM Order", order_id } =
      JSON.parse(event.body || "{}");

    const fields = {
      merchant_id: process.env.PAYFAST_MERCHANT_ID,
      merchant_key: process.env.PAYFAST_MERCHANT_KEY,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,
      m_payment_id,
      amount: Number(amount).toFixed(2),
      item_name,
      name_first, name_last, email_address,
      custom_str1: order_id,
    };

    const signature = sign(fields, process.env.PAYFAST_PASSPHRASE);
    const url = `${pfBase}?${querystring.stringify({ ...fields, signature })}`;
    return { statusCode: 200, body: JSON.stringify({ redirect: url }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: e.message };
  }
};

