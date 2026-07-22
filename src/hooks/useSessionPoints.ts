"use client";

import { useEffect, useState } from "react";
import { readSession } from "@/lib/authSession";

export function useSessionPoints() {
  const [points, setPoints] = useState(0);

  useEffect(() => {
    const sync = () => setPoints(readSession()?.points ?? 0);
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("dramaeditor-session", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("dramaeditor-session", sync);
    };
  }, []);

  return points;
}
