import { requireAuth } from "@/lib/auth-guard";
import { subscribeToRunEvents, type RunEvent } from "@/lib/ai-watch/run-events";

export const runtime = "nodejs";

const HEARTBEAT_INTERVAL_MS = 15_000;

function toSseChunk(event: RunEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET(request: Request) {
  const session = await requireAuth();
  const userId = session.user.id;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();

      const unsubscribe = subscribeToRunEvents(userId, (event) => {
        controller.enqueue(encoder.encode(toSseChunk(event)));
      });

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, HEARTBEAT_INTERVAL_MS);

      const cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      };

      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
