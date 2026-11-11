"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MODEL_ALIASES } from "@openllmsh/sdk/connect/chat";
import { Board, Tile } from "@/components/grid";
import { Logo } from "@/components/logo";
import { LANDING_PRIMARY_CLASS } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type TMessage = { role: "user" | "assistant"; content: string };

const ALIASES: readonly string[] = MODEL_ALIASES;

export function Chat({
  label,
  via,
  models,
}: {
  label: string;
  via: "apiKey" | "connect";
  models: string[];
}): React.ReactElement {
  const router = useRouter();
  const options = [...ALIASES, ...models.filter((m) => !ALIASES.includes(m))];
  const [model, setModel] = useState("plus");
  const [messages, setMessages] = useState<TMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const send = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const history: TMessage[] = [...messages, { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model, messages: history }),
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
        setMessages(history);
        setError(`${body.error?.code ?? res.status}: ${body.error?.message ?? "request failed"}`);
        if (res.status === 401) router.refresh();
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: reply }]);
        bottom.current?.scrollIntoView({ block: "end" });
      }
    } finally {
      setBusy(false);
    }
  };

  const signOut = async (): Promise<void> => {
    await fetch("/api/disconnect", { method: "POST" });
    router.refresh();
  };

  return (
    <main className="bg-background h-svh">
      <Board className="mx-auto h-svh max-w-3xl grid-rows-[auto_1fr_auto] border-x border-[var(--grid-seam)]">
        <Tile className="flex flex-wrap items-center gap-3 px-4 py-3">
          <Logo className="h-4" />
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-mono text-[10px] tracking-[0.18em] uppercase">
            {via === "connect" ? "connected" : "api key"}
          </span>
          <span className="text-muted-foreground hidden truncate font-mono text-xs sm:inline">{label}</span>
          <div className="ml-auto flex items-center gap-2">
            <Select value={model} onValueChange={(v) => v && setModel(v)}>
              <SelectTrigger className="w-44 font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((m) => (
                  <SelectItem key={m} value={m} className="font-mono text-xs">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={signOut}>
              {via === "connect" ? "Disconnect" : "Sign out"}
            </Button>
          </div>
        </Tile>

        <Tile className="min-h-0">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-3 p-4 sm:p-6">
              {messages.length === 0 && (
                <div className="text-muted-foreground flex flex-col items-center gap-2 py-24 text-center text-sm">
                  <p className="text-foreground text-3xl font-semibold tracking-tighter text-balance">What&apos;s on your mind?</p>
                  <p className="font-mono text-xs tracking-[0.08em]">
                    model <span className="text-foreground">{model}</span> · from your OpenLLM account
                  </p>
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                    m.role === "user" ? "bg-primary text-primary-foreground self-end" : "bg-muted self-start",
                  )}
                >
                  {m.content || <span className="text-muted-foreground animate-pulse">…</span>}
                </div>
              ))}
              <div ref={bottom} />
            </div>
          </ScrollArea>
        </Tile>

        <Tile className="flex flex-col gap-2 p-4">
          {error && <p className="text-destructive text-xs">{error}</p>}
          <form onSubmit={send} className="flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message" disabled={busy} />
            <Button type="submit" className={LANDING_PRIMARY_CLASS} disabled={busy || !input.trim()}>
              Send
            </Button>
          </form>
        </Tile>
      </Board>
    </main>
  );
}
