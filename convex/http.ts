import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/getFile",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const { searchParams } = new URL(request.url);
    const storageId = searchParams.get("storageId");
    if (!storageId) {
      return new Response("Missing storageId", { status: 400 });
    }
    const blob = await ctx.storage.get(storageId as any);
    if (!blob) {
      return new Response("File not found", { status: 404 });
    }

    // CORS 헤더 추가 (fetch 허용)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    return new Response(blob, {
      status: 200,
      headers: new Headers(corsHeaders),
    });
  }),
});

export default http;
