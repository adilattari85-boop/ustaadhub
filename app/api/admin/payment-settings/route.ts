import { getPaymentGatewayStatus } from "@/lib/payments/config";
import {
  createUserClient,
  extractBearerToken,
  jsonResponse,
  resolveUserId,
} from "@/lib/payments/server";

// Admin-only, non-secret gateway configuration status.
//
// The admin settings screen uses this to warn before enabling the switch, so
// the gateway can never be turned on while the server-side credentials are
// missing (every order/verification would then fail for students).
//
// Security model:
//  - the caller must present a valid Supabase access token,
//  - public.is_admin() is evaluated with the CALLER'S token, so only a real
//    admin gets an answer; students/public users are rejected,
//  - only booleans and the PUBLIC key id are returned - never a secret.

export const runtime = "nodejs";

export async function GET(request: Request) {
  const accessToken = extractBearerToken(request);

  if (!accessToken) {
    return jsonResponse({ error: "missing_token" }, 401);
  }

  const userId = await resolveUserId(accessToken);

  if (!userId) {
    return jsonResponse({ error: "invalid_token" }, 401);
  }

  const userClient = createUserClient(accessToken);

  if (!userClient) {
    return jsonResponse({ error: "server_not_configured" }, 503);
  }

  const { data: isAdmin, error: adminError } =
    await userClient.rpc("is_admin");

  if (adminError) {
    console.error(
      "[payments/admin] admin check failed:",
      adminError.message,
    );

    return jsonResponse({ error: "admin_check_failed" }, 500);
  }

  if (isAdmin !== true) {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  return jsonResponse(getPaymentGatewayStatus());
}