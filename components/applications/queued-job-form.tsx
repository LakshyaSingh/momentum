"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { QueuedJobSchema } from "@/lib/validators";
import { useApplicationFieldSuggestions } from "@/lib/hooks/use-application-field-suggestions";
import { hostnameFromUrl, type QueuedJobRow } from "@/lib/queued-jobs";
import { cn } from "@/lib/utils";

/**
 * Company and role are optional on a queue row but required to become an
 * application, so this form — the one place a user fills them in deliberately —
 * demands them. Saving back to the queue with them still blank would leave the
 * row in exactly the state that sent the user here.
 */
const QueuedJobFormSchema = QueuedJobSchema.extend({
  company: z.string().trim().min(1, "Company is required").max(120),
  role: z.string().trim().min(1, "Role is required").max(160),
});

export type QueuedJobFormValues = z.infer<typeof QueuedJobFormSchema>;

/** Which button was pressed. The form collects the same fields either way. */
export type QueuedJobFormIntent = "save" | "save-and-apply";

export function QueuedJobForm({
  row,
  onSubmit,
  onCancel,
}: {
  row: QueuedJobRow;
  onSubmit: (values: QueuedJobFormValues, intent: QueuedJobFormIntent) => Promise<void>;
  onCancel?: () => void;
}) {
  const [saving, setSaving] = useState<QueuedJobFormIntent | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const { companies, roles, locations } = useApplicationFieldSuggestions();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<QueuedJobFormValues>({
    resolver: zodResolver(QueuedJobFormSchema),
    defaultValues: {
      jobLink: row.jobLink,
      company: row.company ?? "",
      companyDomain: row.companyDomain ?? undefined,
      role: row.role ?? "",
      location: row.location ?? undefined,
      salary: row.salary ?? undefined,
      notes: row.notes ?? undefined,
    },
  });

  const run = (intent: QueuedJobFormIntent) =>
    handleSubmit(async (values) => {
      setServerError(null);
      setSaving(intent);
      try {
        await onSubmit(values, intent);
      } catch (err) {
        console.error("Queued job form submit failed", err);
        setServerError("Something went wrong. Try again.");
      } finally {
        setSaving(null);
      }
    });

  const busy = saving !== null;

  return (
    <form className="space-y-5" onSubmit={(event) => void run("save")(event)}>
      <Field label="Job link" error={errors.jobLink?.message}>
        <Input {...register("jobLink")} inputMode="url" spellCheck={false} />
        <p className="mt-1 text-xs text-muted-foreground">
          {hostnameFromUrl(row.jobLink) ?? "Unrecognised host"}
        </p>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Company" error={errors.company?.message}>
          <Controller
            control={control}
            name="company"
            render={({ field }) => (
              <AutocompleteInput
                placeholder="Apple"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                suggestions={companies}
                autoFocus
              />
            )}
          />
        </Field>
        <Field label="Role" error={errors.role?.message}>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <AutocompleteInput
                placeholder="Senior Software Engineer"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                suggestions={roles}
              />
            )}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Location" error={errors.location?.message}>
          <Controller
            control={control}
            name="location"
            render={({ field }) => (
              <AutocompleteInput
                placeholder="Remote"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                suggestions={locations}
              />
            )}
          />
        </Field>
        <Field label="Salary" error={errors.salary?.message}>
          <Input placeholder="$180k–220k" {...register("salary")} />
        </Field>
      </div>

      <Field label="Notes" error={errors.notes?.message}>
        <Textarea rows={3} {...register("notes")} />
      </Field>

      {serverError && <p className="text-sm text-red-500">{serverError}</p>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
        {/*
         * Two outcomes from one form. "Save" is secondary because it is the
         * non-destructive one — the row stays queued and nothing enters the
         * funnel. "Save & mark as applied" makes the same assertion the row
         * button does: that the application really was submitted.
         */}
        <Button type="submit" variant="outline" disabled={busy}>
          {saving === "save" ? "Saving…" : "Save"}
        </Button>
        <Button type="button" disabled={busy} onClick={() => void run("save-and-apply")()}>
          {saving === "save-and-apply" ? "Saving…" : "Save & mark as applied"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
