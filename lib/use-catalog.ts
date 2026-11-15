"use client";

import { useEffect, useState } from "react";
import type { Catalog } from "./catalog";

export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/catalog.json", { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Catalog: HTTP ${response.status}`);
        return response.json() as Promise<Catalog>;
      })
      .then(setCatalog)
      .catch((cause: unknown) => {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) setError(true);
      });
    return () => controller.abort();
  }, []);
  return { catalog, error };
}
