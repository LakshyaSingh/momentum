import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from "mcp-handler";
import { mcpResourceUrl, supabaseAuthServerUrl } from "@/lib/env";

export const runtime = "nodejs";

/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728). Tells MCP clients that the
 * Supabase OAuth 2.1 server is the authorization server for this resource.
 */
const handler = protectedResourceHandler({
  authServerUrls: supabaseAuthServerUrl ? [supabaseAuthServerUrl] : [],
  resourceUrl: mcpResourceUrl,
});

const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
