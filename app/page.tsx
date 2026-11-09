import { Suspense } from "react";
import { Chat } from "@/components/chat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { openllmFetch } from "@/lib/openllm-connect";
import { openllm } from "@/lib/openllm";
import { loadConnection, saveConnection } from "@/lib/store";

const listModels = async (): Promise<string[]> => {
  const conn = await loadConnection();
  if (!conn) return [];
  try {
    const res = await openllmFetch(openllm(), conn, "/v1/models", {}, saveConnection);
    const body = (await res.json()) as { data?: { id: string }[] };
    return body.data?.map((m) => m.id) ?? [];
  } catch {
    return [];
  }
};

async function Content({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}): Promise<React.ReactElement> {
  const { error } = await searchParams;
  const conn = await loadConnection();

  if (!conn)
    return (
      <main className="flex min-h-svh items-center justify-center p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle>Tiny Chat</CardTitle>
            <CardDescription>Chat on your own AI, through OpenLLM.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <a href="/api/connect/start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${openllm().apiOrigin}/connect/button.svg`} alt="Connect with OpenLLM" height={44} />
            </a>
            {error && <p className="text-destructive text-sm">Couldn&apos;t connect: {error}</p>}
          </CardContent>
        </Card>
      </main>
    );

  const models = await listModels();
  return <Chat userId={conn.userId} models={models} />;
}

export default function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}): React.ReactElement {
  return (
    <Suspense>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
