"use client";

import { useEffect, useRef, useState } from "react";

import type { RunEvent } from "@/lib/ai-watch/run-events";

export interface AiWatchRunState {
  status: "idle" | "running" | "success" | "error";
  steps: string[];
  errorMessage?: string;
}

/** Se connecte au flux SSE de la veille et tient l'état du run en cours. */
export function useAiWatchStream(onFinished: () => void): AiWatchRunState {
  const [state, setState] = useState<AiWatchRunState>({
    status: "idle",
    steps: [],
  });
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    const source = new EventSource("/api/ai-watch/stream");

    source.onmessage = (event) => {
      const data = JSON.parse(event.data) as RunEvent;

      switch (data.type) {
        case "run:started":
          setState({ status: "running", steps: [] });
          break;
        case "run:progress":
          setState((prev) => ({
            ...prev,
            status: "running",
            steps: [
              ...prev.steps,
              data.detail ? `${data.step}: ${data.detail}` : data.step,
            ],
          }));
          break;
        case "run:finished":
          setState((prev) => ({ ...prev, status: "success" }));
          onFinishedRef.current();
          break;
        case "run:error":
          setState((prev) => ({
            ...prev,
            status: "error",
            errorMessage: data.message,
          }));
          break;
      }
    };

    return () => source.close();
  }, []);

  return state;
}
