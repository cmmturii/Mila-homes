const axios = require("axios");

const BASE_URL = process.env.MPESA_ENV === "production"
  ? "https://api.safaricom.co.ke"
  : "https://sandbox.safaricom.co.ke";

/** Format any Kenyan phone to 254XXXXXXXXX */
function formatPhone(phone) {
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0"))    p = "254" + p.slice(1);
  if (p.startsWith("+"))    p = p.slice(1);
  if (!p.startsWith("254")) p = "254" + p;
  return p;
}

/** Get OAuth bearer token from Safaricom */
async function getMpesaToken() {
  const creds = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");

  const { data } = await axios.get(
    `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${creds}` } }
  );
  return data.access_token;
}

/** Build STK push Base64 password */
function getMpesaPassword(timestamp) {
  const str = process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp;
  return Buffer.from(str).toString("base64");
}

module.exports = { BASE_URL, formatPhone, getMpesaToken, getMpesaPassword };
