"use server";

/*
 * The password lives only in the ACCESS_PASSWORD environment variable
 * (Vercel project settings / .env.local) and the destination URL only in
 * this server module — neither is ever included in the client bundle.
 * The action returns the URL exclusively on a correct attempt.
 */

const REDIRECT_URL =
  "https://shrub-headlight-f60.notion.site/Open-Roles-2cbfc6a46be380a58bbcfbdcb96d828e";

type VerifyResult = { ok: true; url: string } | { ok: false };

export async function verifyAccess(password: unknown): Promise<VerifyResult> {
  const expected = process.env.ACCESS_PASSWORD;

  if (!expected || typeof password !== "string" || password !== expected) {
    return { ok: false };
  }

  return { ok: true, url: REDIRECT_URL };
}
