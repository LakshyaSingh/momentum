"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ThemeSelector } from "@/components/theme-selector";
import { updatePreferences } from "@/app/actions/user";

const TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Toronto",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Madrid",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

interface SettingsFormProps {
  name: string;
  email: string;
  dailyGoal: number;
  timezone: string;
}

export function SettingsForm({ name, email, dailyGoal, timezone }: SettingsFormProps) {
  const [pending, start] = useTransition();
  const [n, setN] = useState(name);
  const [goal, setGoal] = useState(dailyGoal);
  const [tz, setTz] = useState(timezone);

  const timezoneOptions = useMemo(() => {
    if (TIMEZONES.includes(timezone)) return TIMEZONES;
    return [timezone, ...TIMEZONES];
  }, [timezone]);

  function save() {
    start(async () => {
      const res = await updatePreferences({ name: n, dailyGoal: goal, timezone: tz });
      if (res.ok) toast.success("Saved");
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">How Momentum greets you.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={n} onChange={(e) => setN(e.target.value)} placeholder="Ada Lovelace" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} disabled />
        </div>
      </div>

      <Separator />

      <div>
        <h2 className="text-base font-semibold tracking-tight">Daily goal</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {goal} application{goal === 1 ? "" : "s"} a day. Steady wins.
        </p>
      </div>
      <div className="flex items-center gap-4">
        <Slider value={[goal]} onValueChange={(v) => setGoal(v[0] ?? 1)} min={1} max={20} step={1} className="flex-1" />
        <span className="w-10 text-right text-2xl font-semibold tracking-tighter">{goal}</span>
      </div>

      <Separator />

      <div>
        <h2 className="text-base font-semibold tracking-tight">Timezone</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Streaks reset at midnight in your zone. We detect this from your browser automatically;
          change it here if you need something different.
        </p>
      </div>
      <div className="max-w-md">
        <Select value={tz} onValueChange={setTz}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {timezoneOptions.map((z) => (
              <SelectItem key={z} value={z}>{z}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Theme</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Light, dark, or match your device.
          </p>
        </div>
        <ThemeSelector />
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
      </div>
    </div>
  );
}
