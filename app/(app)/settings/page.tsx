import { requireUser } from "@/lib/auth";
import { GlassCard } from "@/components/glass/glass-card";
import { SettingsForm } from "@/components/settings/settings-form";
import { DangerZone } from "@/components/settings/danger-zone";
import { ExportButton } from "@/components/settings/export-button";
import { Separator } from "@/components/ui/separator";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="space-y-8">
      <ScrollReveal as="header">
        <h1 className="text-display-md font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">Tune the system to fit your rhythm.</p>
      </ScrollReveal>

      <ScrollReveal delay={0.05}>
        <GlassCard className="p-6 sm:p-8">
          <SettingsForm
            name={user.name ?? ""}
            email={user.email}
            dailyGoal={user.dailyGoal}
            timezone={user.timezone}
          />
        </GlassCard>
      </ScrollReveal>

      <ScrollReveal>
        <GlassCard className="p-6 sm:p-8">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Your data</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Export everything as a CSV. You always own your applications.
            </p>
          </div>
          <Separator className="my-5" />
          <ExportButton />
        </GlassCard>
      </ScrollReveal>

      <ScrollReveal>
        <DangerZone />
      </ScrollReveal>
    </div>
  );
}
