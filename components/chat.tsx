"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MODEL_ALIASES } from "@openllmsh/sdk/connect/chat";
import { cn } from "@/lib/utils";

type TMessage = { role: "user" | "assistant"; content: string };

const ALIASES: readonly string[] = MODEL_ALIASES;

export function Chat({ userId, models }: { userId: string; models: string[] }): React.ReactElement {
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

  const disconnect = async (): Promise<void> => {
    await fetch("/api/disconnect", { method: "POST" });
    router.refresh();
  };

  return (
    <main className="mx-auto flex h-svh max-w-2xl flex-col gap-3 p-4">
      <header className="flex items-center gap-2">
        <h1 className="font-semibold">Tiny Chat</h1>
        <span className="text-muted-foreground truncate text-xs">{userId}</span>
        <div className="ml-auto flex items-center gap-2">
          <Select value={model} onValueChange={(v) => v && setModel(v)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={disconnect}>
            Disconnect
          </Button>
        </div>
      </header>

      <ScrollArea className="min-h-0 flex-1 rounded-lg border">
        <div className="flex flex-col gap-3 p-4">
          {messages.length === 0 && (
            <p className="text-muted-foreground py-16 text-center text-sm">Say something.</p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                m.role === "user" ? "bg-primary text-primary-foreground self-end" : "bg-muted self-start",
              )}
            >
              {m.content || "…"}
            </div>
          ))}
          <div ref={bottom} />
        </div>
      </ScrollArea>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <form onSubmit={send} className="flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message" disabled={busy} />
        <Button type="submit" disabled={busy || !input.trim()}>
          Send
        </Button>
      </form>
    </main>
  );
}
