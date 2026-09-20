const API_KEY = process.env.OC_API_KEY!;
const SECRET_KEY = process.env.OC_SECRET_KEY!;

const encoder = new TextEncoder();

async function hmacSha256Base64(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  const bytes = new Uint8Array(signature);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function callB402(operation: string, body: object) {
  const requestPath = `/build/api/v2/b402/${operation}`;
  const rawBody = JSON.stringify({ body });
  const timestamp = new Date().toISOString();
  const preHash = timestamp + "POST" + requestPath + rawBody;
  const signature = await hmacSha256Base64(SECRET_KEY, preHash);

  const res = await fetch(`https://web3.binance.com${requestPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-OC-APIKEY": API_KEY,
      "X-OC-TIMESTAMP": timestamp,
      "X-OC-SIGN": signature,
    },
    body: rawBody,
  });

  return res.json();
}
