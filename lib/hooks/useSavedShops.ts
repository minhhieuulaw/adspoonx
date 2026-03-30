"use client";

import { useState, useEffect, useCallback } from "react";

export function useSavedShops() {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/saved-shops")
      .then(r => r.json())
      .then(d => setSavedIds(new Set(d.data ?? [])))
      .catch(() => {});
  }, []);

  const toggleSave = useCallback(async (shopPageId: string) => {
    // Optimistic update
    setSavedIds(prev => {
      const next = new Set(prev);
      next.has(shopPageId) ? next.delete(shopPageId) : next.add(shopPageId);
      return next;
    });

    try {
      const r = await fetch("/api/saved-shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopPageId }),
      });
      const data = await r.json();
      // Sync with server state
      setSavedIds(prev => {
        const next = new Set(prev);
        if (data.saved) next.add(shopPageId);
        else next.delete(shopPageId);
        return next;
      });
    } catch {
      // Revert on error
      setSavedIds(prev => {
        const next = new Set(prev);
        next.has(shopPageId) ? next.delete(shopPageId) : next.add(shopPageId);
        return next;
      });
    }
  }, []);

  return { savedIds, toggleSave };
}
