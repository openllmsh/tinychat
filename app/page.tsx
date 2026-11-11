import { Suspense } from "react";
import { Chat } from "@/components/chat";
import { Welcome } from "@/components/welcome";
import { connectButtonUrl, isOpenLLMError } from "@openllmsh/sdk/connect";
import { connect, currentUser } from "@/lib/openllm";

async function Content({ searchParams }: { searchParams: Promise<{ error?: string }> }): Promise<React.ReactElement> {
  const { error } = await searchParams;
  const user = await currentUser();
  // A revoked connection or a dead key sends the visitor back to the start.
  // Any other failure just leaves the model list empty.
  const models = user
    ? await user
        .models()
        .then((list) => list.map((m) => m.id))
        .catch((err: unknown) => (isOpenLLMError(err) && (err.needsReconnect || err.status === 401) ? null : []))
    : null;

  if (!user || !models)
    return <Welcome connectButton={connect ? connectButtonUrl(connect.config) : null} connectError={error} />;

  return <Chat label={user.label} via={user.via} models={models} />;
}

export default function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }): React.ReactElement {
  return (
    <Suspense>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
