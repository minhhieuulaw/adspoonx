"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import type { FbAd } from "@/lib/facebook-ads";

interface SavedAdEntry {
  id: string;
  adId: string;
  createdAt: string;
}

export function useSavedAds() {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Fetch saved ad IDs on mount
  useEffect(() => {
    async function fetchSaved() {
      try {
        const res = await axios.get<SavedAdEntry[]>("/api/saved");
        setSavedIds(new Set(res.data.map((s) => s.adId)));
      } catch {
        // Not critical — user might not be logged in
      }
    }
    fetchSaved();
  }, []);

  const toggleSave = useCallback(async (ad: FbAd) => {
    setLoading(true);
    try {
      const res = await axios.post<{ saved: boolean }>("/api/saved", {
        adId: ad.id,
        adData: ad,
      });
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (res.data.saved) {
          next.add(ad.id);
        } else {
          next.delete(ad.id);
        }
        return next;
      });
    } catch {
      console.error("Failed to toggle save");
    } finally {
      setLoading(false);
    }
  }, []);

  return { savedIds, toggleSave, loading };
}
