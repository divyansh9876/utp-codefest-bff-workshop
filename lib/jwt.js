function base64UrlDecode(segment) {
  let s = segment.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const binary = atob(s);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function base64UrlEncode(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decodes (does NOT verify) a JWT. Verification needs the secret, which only the server has. */
export function decodeJwt(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    return { error: "A JWT has exactly 3 parts separated by dots: header.payload.signature", parts };
  }
  try {
    return {
      header: JSON.parse(base64UrlDecode(parts[0])),
      payload: JSON.parse(base64UrlDecode(parts[1])),
      signature: parts[2],
      parts,
    };
  } catch {
    return { error: "Couldn't decode — header and payload must be base64url-encoded JSON", parts };
  }
}

/** An unsigned demo token so the inspector can be explained before the login route exists. */
export function makeDemoToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: "66f1c0ffee0000000000demo",
    name: "Demo Hacker",
    email: "demo@utp.edu.my",
    iat: now,
    exp: now + 60 * 60,
  };
  const fakeSignature = base64UrlEncode("demo-signature-not-verifiable-without-JWT_SECRET");
  return `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}.${fakeSignature}`;
}
