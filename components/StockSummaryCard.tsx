"use client";

import { useState, useTransition } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { getStockSummary, type StockSummary } from "@/lib/actions/ai.actions";

const sentimentStyles: Record<string, string> = {
  Bullish: "bg-green-500/15 text-green-400 border border-green-500/30",
  Bearish: "bg-red-500/15 text-red-400 border border-red-500/30",
  Neutral: "bg-gray-500/15 text-gray-300 border border-gray-500/30",
};

const StockSummaryCard = ({ symbol }: { symbol: string }) => {
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const generate = () => {
    setError(null);
    startTransition(async () => {
      const res = await getStockSummary(symbol);
      setLoaded(true);
      if (res.success && res.data) {
        setSummary(res.data);
      } else {
        setSummary(null);
        setError(res.error || "Something went wrong");
      }
    });
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-[#141414] p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          <h3 className="text-base font-semibold text-gray-100">
            What&apos;s happening with {symbol}?
          </h3>
        </div>
        {summary?.sentiment && (
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${sentimentStyles[summary.sentiment] || sentimentStyles.Neutral}`}>
            {summary.sentiment}
          </span>
        )}
      </div>

      <div className="mt-4">
        {isPending && (
          <div className="space-y-3" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-4 w-full animate-pulse rounded bg-gray-700/60" />
            ))}
          </div>
        )}

        {!isPending && summary && (
          <ul className="space-y-3">
            {summary.bullets.map((b, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-gray-300">
                <span className="mt-0.5 font-bold text-yellow-500">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}

        {!isPending && error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {!isPending && !loaded && (
          <p className="text-sm text-gray-500">
            Get an AI-generated, plain-English summary of recent price action and news.
          </p>
        )}
      </div>

      <button
        onClick={generate}
        disabled={isPending}
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-yellow-900 transition-colors hover:bg-yellow-400 disabled:opacity-60"
      >
        {isPending ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            {loaded ? "Regenerate summary" : "Generate AI summary"}
          </>
        )}
      </button>

      <p className="mt-3 text-xs text-gray-600">
        AI-generated. Not financial advice.
      </p>
    </div>
  );
};

export default StockSummaryCard;
