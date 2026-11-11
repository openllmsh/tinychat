"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LANDING_PRIMARY_CLASS } from "@/lib/brand";

/** Paste an API key; the server checks it and keeps it in an httpOnly cookie. */
export function KeyForm(): React.ReactElement {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/key", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key }),
    });
    if (res.ok) return router.refresh();
    setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Something went wrong.");
    setBusy(false);
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-llm-…"
          className="font-mono"
          aria-label="OpenLLM API key"
        />
        <Button type="submit" className={LANDING_PRIMARY_CLASS} disabled={busy || !key.trim()}>
          {busy ? "Checking…" : "Start chatting"}
        </Button>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </form>
  );
}
