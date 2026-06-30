"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApplicationStatus } from "@prisma/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApplicationSchema, type ApplicationInput } from "@/lib/validators";
import { STATUS_LABELS, STATUS_ORDER } from "@/components/applications/status-pill";
import { createApplication, updateApplication } from "@/app/actions/applications";
import { useMotivationStore } from "@/stores/motivation-store";
import { useApplicationFieldSuggestions } from "@/lib/hooks/use-application-field-suggestions";
import { JobLinkField } from "@/components/applications/job-link-field";
import type { ParsedJobFields } from "@/lib/job-link/types";
import { cn, isoDateKey } from "@/lib/utils";
import { normalizeCompanyDomain, resolveCompanyDomainCandidates } from "@/lib/company-logo";
import {
  clearApplicationsIndexWarmCache,
  warmApplicationsNavigation,
} from "@/lib/applications-index-client";

type Mode = { kind: "create" } | { kind: "edit"; id: string; defaults: Partial<ApplicationInput> };

export function ApplicationForm({
  mode,
  autoFocusJobLink = true,
  onDone,
  onSaved,
}: {
  mode: Mode;
  autoFocusJobLink?: boolean;
  onDone?: () => void;
  onSaved?: (patch: Partial<ApplicationInput>) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const trigger = useMotivationStore((s) => s.trigger);
  const { companies, roles, locations } = useApplicationFieldSuggestions();

  const defaultValues: Partial<ApplicationInput> =
    mode.kind === "edit"
      ? mode.defaults
      : {
          status: ApplicationStatus.APPLIED,
          applicationDate: new Date(),
        };

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ApplicationInput>({
    resolver: zodResolver(ApplicationSchema),
    defaultValues: {
      ...defaultValues,
      // RHF needs a string for date inputs
      applicationDate: defaultValues.applicationDate ?? new Date(),
    },
  });

  function onSubmit(values: ApplicationInput) {
    setServerError(null);
    start(async () => {
      if (mode.kind === "create") {
        const res = await createApplication(values);
        if (!res.ok) {
          setServerError(res.error);
          toast.error(res.error);
          return;
        }
        toast.success(`Logged ${values.company}`);
        clearApplicationsIndexWarmCache();
        try {
          trigger({
            quoteSeed: res.motivation.quoteId,
            milestone: res.milestone,
            streak: res.currentStreak,
          });
        } catch (err) {
          console.error("Motivation overlay failed", err);
        }
        router.refresh();
        warmApplicationsNavigation(router, { forceIndex: true });
        onDone?.();
      } else {
        const res = await updateApplication({ id: mode.id, ...values });
        if (!res.ok) {
          setServerError(res.error);
          toast.error(res.error);
          return;
        }
        toast.success("Updated");
        clearApplicationsIndexWarmCache();
        onSaved?.(values);
        router.refresh();
        warmApplicationsNavigation(router, { forceIndex: true });
        onDone?.();
      }
    });
  }

  function applyParsedFields(fields: ParsedJobFields) {
    const parsedFieldKeys = [
      "role",
      "company",
      "location",
      "salary",
      "recruiter",
      "notes",
    ] as const;

    for (const key of parsedFieldKeys) {
      const value = fields[key];
      setValue(key, value ?? "", {
        shouldDirty: true,
        shouldValidate: key === "role" || key === "company",
      });
    }

    const companyDomain = resolveCompanyDomainCandidates({
      company: fields.company ?? getValues("company"),
      jobLink: getValues("jobLink"),
      hiringOrgUrl: fields.hiringOrgUrl,
    })[0];
    setValue("companyDomain", companyDomain ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Job link" error={errors.jobLink?.message} className="sm:col-span-2">
          <Controller
            control={control}
            name="jobLink"
            render={({ field }) => (
              <JobLinkField
                autoFocus={mode.kind === "create" && autoFocusJobLink}
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                onParsed={applyParsedFields}
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
              />
            )}
          />
        </Field>
        <Field label="Company domain" error={errors.companyDomain?.message}>
          <Controller
            control={control}
            name="companyDomain"
            render={({ field }) => (
              <Input
                placeholder="company.com"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={() => {
                  const normalized = normalizeCompanyDomain(field.value ?? "");
                  if (normalized !== field.value) field.onChange(normalized);
                  field.onBlur();
                }}
              />
            )}
          />
        </Field>
        <Field label="Location" error={errors.location?.message}>
          <Controller
            control={control}
            name="location"
            render={({ field }) => (
              <AutocompleteInput
                placeholder="San Francisco, CA · Remote"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                suggestions={locations}
              />
            )}
          />
        </Field>
        <Field label="Date applied" error={errors.applicationDate?.message}>
          <Controller
            control={control}
            name="applicationDate"
            render={({ field }) => (
              <Input
                type="date"
                value={field.value ? isoDateKey(new Date(field.value)) : ""}
                onChange={(e) => field.onChange(new Date(e.target.value))}
              />
            )}
          />
        </Field>

        <Field label="Status" error={errors.status?.message}>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Salary range">
          <Input placeholder="$160k–$200k" {...register("salary")} />
        </Field>
        <Field label="Recruiter">
          <Input placeholder="Alex Kim" {...register("recruiter")} />
        </Field>

        <Field label="Referral">
          <Input placeholder="Internal referral, friend on team" {...register("referral")} />
        </Field>
        <Field label="Follow-up date">
          <Controller
            control={control}
            name="followUpDate"
            render={({ field }) => (
              <Input
                type="date"
                value={field.value ? isoDateKey(new Date(field.value)) : ""}
                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
              />
            )}
          />
        </Field>

        <Field label="Interview stage">
          <Input placeholder="Onsite · System design" {...register("interviewStage")} />
        </Field>
        <Field label="Offer status">
          <Input placeholder="Pending decision" {...register("offerStatus")} />
        </Field>
      </div>

      <Field label="Notes" error={errors.notes?.message}>
        <Textarea rows={4} placeholder="What stood out? Who did you meet? Next step?" {...register("notes")} />
      </Field>

      {serverError && <p className="text-sm text-red-500">{serverError}</p>}

      <div className="flex items-center justify-end gap-2">
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode.kind === "create" ? "Add application" : "Save changes"}
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
