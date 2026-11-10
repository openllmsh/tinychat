import { Suspense } from "react";
import { Chat } from "@/components/chat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { connectButtonUrl, isOpenLLMError } from "@openllmsh/sdk/connect";
import { connect, LOCAL_USER } from "@/lib/openllm";

async function Content({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}): Promise<React.ReactElement> {
  const { error } = await searchParams;
  const user = await connect.user(LOCAL_USER);
  // A revoked connection is forgotten by the SDK; any other failure just
  // leaves the model list empty.
  const models = user
    ? await user
        .models()
        .then((list) => list.map((m) => m.id))
        .catch((err: unknown) => (isOpenLLMError(err) && err.needsReconnect ? null : []))
    : null;

  if (!user || !models)
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
              <img src={connectButtonUrl(connect.config)} alt="Connect with OpenLLM" height={44} />
            </a>
            {error && <p className="text-destructive text-sm">Couldn&apos;t connect: {error}</p>}
          </CardContent>
        </Card>
      </main>
    );

  return <Chat userId={user.userId} models={models} />;
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
