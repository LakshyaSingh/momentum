import { ImportClient } from "@/components/import/import-client";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { DeclarativeGlassSceneRegistration } from "@/components/glass/declarative-glass-scene";
import { ImportGlassScene } from "@/components/glass/primary-route-glass-scenes";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  return (
    <div className="space-y-8">
      <DeclarativeGlassSceneRegistration id="import">
        <ImportGlassScene />
      </DeclarativeGlassSceneRegistration>
      <ScrollReveal as="header" className="space-y-2">
        <h1 className="text-display-md font-semibold tracking-tight">Bring your history.</h1>
        <p className="max-w-prose text-muted-foreground">
          Drop your existing tracker. Excel, Numbers, Sheets, anything that exports to <code className="font-mono text-xs">.xlsx</code> or <code className="font-mono text-xs">.csv</code>. We&apos;ll guess your columns, you confirm, then everything snaps into Momentum.
        </p>
      </ScrollReveal>
      <ScrollReveal delay={0.05}>
        <ImportClient />
      </ScrollReveal>
    </div>
  );
}
