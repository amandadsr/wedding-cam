"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface RevealTimerProps {
  revealAt: string;
  onRevealed: () => void;
}

export default function RevealTimer({ revealAt, onRevealed }: RevealTimerProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    function update() {
      const now = new Date();
      const target = new Date(revealAt);
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        setRevealed(true);
        setTimeLeft("");
        onRevealed();
        return;
      }

      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      setTimeLeft(
        h > 0
          ? `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`
          : `${m}m ${String(s).padStart(2, "0")}s`
      );
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [revealAt, onRevealed]);

  if (revealed) return null;

  return (
    <div className="flex items-center gap-2 bg-charcoal/5 rounded-xl px-4 py-3">
      <Clock className="w-4 h-4 text-rose flex-shrink-0" />
      <div>
        <p className="text-xs text-gray-500">Fotos reveladas em</p>
        <p className="text-lg font-semibold text-charcoal tabular-nums">{timeLeft}</p>
      </div>
    </div>
  );
}
