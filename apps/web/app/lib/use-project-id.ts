"use client";

import { useEffect, useState } from "react";

/** Unwraps the async `params` promise that Next.js passes to dynamic routes. */
export function useProjectId(params: Promise<{ id: string }>): string {
  const [id, setId] = useState("");
  useEffect(() => {
    void params.then((value) => setId(value.id));
  }, [params]);
  return id;
}
