import { Board, Tile } from "@/components/grid";
import { KeyForm } from "@/components/key-form";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const OPENLLM = "https://www.openllm.sh";
const REPO = "https://github.com/openllmsh/tinychat";

const Ext = ({ href, children }: { href: string; children: React.ReactNode }): React.ReactElement => (
  <a href={href} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
    {children} ↗
  </a>
);

const Pill = ({ children, tone = "muted" }: { children: React.ReactNode; tone?: "brand" | "muted" }): React.ReactElement => (
  <span
    className={cn(
      "rounded-full px-2 py-0.5 font-mono text-[10px] tracking-[0.18em] uppercase",
      tone === "brand" ? "bg-primary/15 text-success-foreground" : "bg-muted text-muted-foreground",
    )}
  >
    {children}
  </span>
);

/** Inline code, one size everywhere. */
const Code = ({ children }: { children: React.ReactNode }): React.ReactElement => (
  <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>
);

/** A numbered step: the number in a ringed mono well, like OpenLLM's setup lists. */
const Steps = ({ items }: { items: React.ReactNode[] }): React.ReactElement => (
  <ol className="flex flex-col gap-4">
    {items.map((item, i) => (
      <li key={i} className="flex gap-3">
        <span className="ring-border text-muted-foreground grid size-6 shrink-0 place-items-center rounded-full font-mono text-xs ring-1">
          {i + 1}
        </span>
        <div className="min-w-0 flex-1 pt-0.5 text-sm leading-6">{item}</div>
      </li>
    ))}
  </ol>
);

const Option = ({
  n,
  title,
  pill,
  blurb,
  sdk,
  children,
}: {
  n: string;
  title: string;
  pill: React.ReactNode;
  blurb: string;
  sdk: string;
  children: React.ReactNode;
}): React.ReactElement => (
  <Tile screws className="flex flex-col gap-6 p-6 sm:p-8">
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">{n}</span>
        {pill}
      </div>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="text-muted-foreground text-sm text-balance">{blurb}</p>
    </div>
    {children}
    <p className="text-muted-foreground mt-auto border-t pt-4 font-mono text-xs tracking-[0.08em]">
      uses <span className="text-foreground">{sdk}</span>
    </p>
  </Tile>
);

export function Welcome({
  connectButton,
  connectError,
}: {
  /** The "Connect with OpenLLM" button image, or `null` when Connect isn't set up. */
  connectButton: string | null;
  connectError?: string;
}): React.ReactElement {
  return (
    <main className="bg-background min-h-svh">
      <Board className="mx-auto min-h-svh max-w-4xl grid-rows-[auto_auto_auto_1fr] border-x border-[var(--grid-seam)]">
        <Tile className="flex items-center gap-3 px-6 py-4">
          <Logo className="h-5" />
          <Pill>tinychat</Pill>
          <a href={REPO} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground ml-auto font-mono text-xs">
            source ↗
          </a>
        </Tile>

        <Tile className="flex flex-col items-center px-6 py-16 text-center sm:py-24">
          <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">A demo of @openllmsh/sdk</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tighter text-balance sm:text-6xl">
            Chat with your own AI.
          </h1>
          <p className="text-muted-foreground mt-6 max-w-lg text-base text-balance sm:text-lg">
            Every model on your OpenLLM account, in one tiny chat. Pick a way in.
          </p>
        </Tile>

        <Board className="md:grid-cols-2">
          <Option
            n="01"
            title="Use an API key"
            pill={<Pill tone="brand">quickest</Pill>}
            blurb="Paste a key from your OpenLLM account and you're chatting. Good for trying it out."
            sdk="@openllmsh/sdk/client"
          >
            <Steps
              items={[
                <>
                  Get a key at <Ext href={`${OPENLLM}/keys`}>openllm.sh/keys</Ext>. Free to sign up.
                </>,
                <div key="paste" className="flex flex-col gap-2">
                  Paste it here.
                  <KeyForm />
                </div>,
                <>Pick a model and say hi.</>,
              ]}
            />
            <p className="text-muted-foreground text-xs">
              The key stays in an httpOnly cookie on this app&apos;s server. Your browser&apos;s JavaScript never sees it.
            </p>
          </Option>

          <Option
            n="02"
            title="Connect with OpenLLM"
            pill={connectButton ? <Pill tone="brand">ready</Pill> : <Pill>optional · not set up</Pill>}
            blurb="For real apps: each user signs in with their own OpenLLM account. You never handle a key, and they bring their own models."
            sdk="@openllmsh/sdk/connect"
          >
            {connectButton ? (
              <>
                <Steps
                  items={[
                    <>Click the button.</>,
                    <>Approve tinychat on OpenLLM.</>,
                    <>You&apos;re back here, chatting on your own account.</>,
                  ]}
                />
                <a href="/api/connect/start" className="self-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={connectButton} alt="Connect with OpenLLM" height={44} />
                </a>
                {connectError && <p className="text-destructive text-xs">Couldn&apos;t connect: {connectError}</p>}
              </>
            ) : (
              <Steps
                items={[
                  <>
                    Create an app at <Ext href={`${OPENLLM}/settings/apps`}>Settings → Developers → Apps</Ext>.
                  </>,
                  <>
                    Add the callback URL{" "}
                    <Code>http://localhost:3005/callback</Code>
                  </>,
                  <>
                    Paste the app&apos;s <Code>.env</Code> block into{" "}
                    <Code>.env.local</Code> and restart{" "}
                    <Code>bun dev</Code>. This card turns into a button.
                  </>,
                ]}
              />
            )}
          </Option>
        </Board>

        <Tile className="text-muted-foreground flex flex-wrap items-start justify-center gap-x-4 gap-y-1 px-6 py-6 font-mono text-xs">
          <span>
            built with <Ext href="https://www.npmjs.com/package/@openllmsh/sdk">@openllmsh/sdk</Ext>
          </span>
          <span>
            <Ext href="https://docs.openllm.sh">docs</Ext>
          </span>
        </Tile>
      </Board>
    </main>
  );
}
