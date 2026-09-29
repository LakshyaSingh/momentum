"use client";

import { startTransition, useRef, useState } from "react";
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
import { useMotivationStore, whenMotivationDismissed } from "@/stores/motivation-store";
import { pickMotivationSeed } from "@/lib/motivation-seed";
import { useApplicationFieldSuggestions } from "@/lib/hooks/use-application-field-suggestions";
import { JobLinkField } from "@/components/applications/job-link-field";
import type { ParsedJobFields } from "@/lib/job-link/types";
import { cn, isoDateKey } from "@/lib/utils";
import { normalizeCompanyDomain, resolveCompanyDomainCandidates } from "@/lib/company-logo";
import {
  clearApplicationsIndexWarmCache,
  warmApplicationsNavigation,
} from "@/lib/applications-index-client";
import {
  newPendingRow,
  rememberSettledRow,
  useAddPendingApplication,
} from "@/components/applications/optimistic-applications";

type CreateResult = Awaited<ReturnType<typeof createApplication>>;

type Mode =
  | { kind: "create"; defaults?: Partial<ApplicationInput> }
  | { kind: "edit"; id: string; defaults: Partial<ApplicationInput> };

export function ApplicationForm({
  mode,
  autoFocusJobLink = true,
  onDone,
  onSaved,
  onCreated,
  onCreateFailed,
  initialError,
}: {
  mode: Mode;
  autoFocusJobLink?: boolean;
  onDone?: () => void;
  /** Edit only — receives the validated values after a successful update. */
  onSaved?: (patch: Partial<ApplicationInput>) => void;
  /**
   * Create only — receives the new application id after a successful create.
   * Used by the queue to drop its row once the job has actually been applied to.
   */
  onCreated?: (id: string) => void;
  /**
   * Create only — the sheet has already closed by the time the server answers,
   * so a failure hands the values back to reopen it without losing the entry.
   */
  onCreateFailed?: (values: ApplicationInput, error: string) => void;
  /** Shown above the buttons when the sheet reopens after a failed create. */
  initialError?: string;
}) {
  const router = useRouter();
  // One submit at a time. A create keeps the sheet open under the banner, with
  // focus still in the form, so a second Enter there would log it twice. Every
  // path that ends a submit clears this, because a sheet reopened before its
  // exit animation finishes reuses this same form instance.
  const submitted = useRef(false);
  const [serverError, setServerError] = useState<string | null>(initialError ?? null);
  const trigger = useMotivationStore((s) => s.trigger);
  const queueMilestone = useMotivationStore((s) => s.queueMilestone);
  const dismissMotivation = useMotivationStore((s) => s.dismiss);
  const addPending = useAddPendingApplication();
  const { companies, roles, locations } = useApplicationFieldSuggestions();

  const defaultValues: Partial<ApplicationInput> =
    mode.kind === "edit"
      ? mode.defaults
      : {
          status: ApplicationStatus.APPLIED,
          applicationDate: new Date(),
          ...mode.defaults,
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
    if (submitted.current) return;
    submitted.current = true;
    setServerError(null);

    if (mode.kind === "edit") {
      saveEdit(values, mode.id);
      submitted.current = false;
      return;
    }

    saveCreate(values);
  }

  /**
   * Create in the order the moment should be felt: banner first, then the page.
   *
   * 1. The motivation banner opens on submit, over the still-open sheet. It needs
   *    nothing from the server — its seeds are random either way — so it no
   *    longer waits a round trip to appear. The save runs underneath it.
   * 2. Dismissing the banner (tap, Esc, or its 7s timeout) closes the sheet and
   *    reveals the page with the new row and the goal ring moving to the new
   *    count. Nothing on the page changes while the banner is up, so that
   *    movement is seen rather than missed behind it.
   * 3. A streak milestone is only known once the server answers; it is attached
   *    to the store when it arrives and plays after the banner closes.
   *
   * The page update is held back by this transition itself. It stays open until
   * after the dismissal, and React does not commit the server action's
   * revalidated page before the async action it belongs to settles. If the
   * server has already answered, the confirmed row lands as the sheet slides
   * away; if not, a pending row (`PendingApplicationsProvider`) stands in until
   * it does and then hands over in the same commit.
   *
   * No `router.refresh()`: the action's response already carries the page.
   *
   * A failure while the banner is up closes the banner and leaves the sheet
   * open with the error, rather than celebrating a save that did not happen.
   */
  function saveCreate(values: ApplicationInput) {
    const row = newPendingRow(values);
    const seed = pickMotivationSeed();
    trigger({ quoteSeed: seed.quoteId, milestone: null, streak: 0 });

    startTransition(async () => {
      let settled: CreateResult | null = null;
      const request = createApplication(values)
        .catch((): CreateResult => ({ ok: false, error: "Could not reach the server." }))
        .then((res) => {
          settled = res;
          if (!res.ok) dismissMotivation();
          else queueMilestone(res.milestone, res.currentStreak);
          return res;
        });

      await whenMotivationDismissed();

      const early = settled as CreateResult | null;
      if (early && !early.ok) {
        failCreate(values, early.error, { sheetOpen: true });
        return;
      }

      if (!early) startTransition(() => addPending(row));
      onDone?.();
      submitted.current = false;

      const res = await request;
      if (!res.ok) {
        failCreate(values, res.error, { sheetOpen: false });
        return;
      }

      rememberSettledRow(res.id, row.id);
      toast.success(`Logged ${values.company}`);
      clearApplicationsIndexWarmCache();
      onCreated?.(res.id);
      warmApplicationsNavigation(router, { forceIndex: true });
    });
  }

  function failCreate(values: ApplicationInput, error: string, { sheetOpen }: { sheetOpen: boolean }) {
    toast.error(`${values.company} wasn’t saved. ${error}`);
    submitted.current = false;
    // Shown inline when this instance is still (or again) on screen; a fresh
    // mount after a reopen gets the same message through `initialError`.
    setServerError(error);
    if (!sheetOpen) onCreateFailed?.(values, error);
  }

  /**
   * Optimistic save for an existing row: patch the list and start the sheet's
   * exit animation now, then write.
   *
   * An edit is a decision the user has already made — most often a single
   * status change — so holding the sheet open for the round trip makes the app
   * feel slower than it is, and closing only once the server answers reads as a
   * stall rather than as a save.
   *
   * Deliberately NOT inside `start()`. React keeps a transition pending until
   * its async body settles, so a close scheduled inside one does not commit
   * until the write returns — measured at ~2.5s against a dev server, which is
   * the exact delay this is meant to remove.
   *
   * The parent applies the same patch to its local row, so the new value is on
   * screen immediately and no success toast is needed. On failure we say so and
   * refresh, which puts the server's truth back into the row.
   */
  function saveEdit(values: ApplicationInput, id: string) {
    onSaved?.(values);
    onDone?.();
    clearApplicationsIndexWarmCache();

    void (async () => {
      const res = await updateApplication({ id, ...values }).catch(() => ({
        ok: false as const,
        error: "Could not reach the server.",
      }));

      if (!res.ok) {
        toast.error(res.error);
        router.refresh();
        return;
      }

      router.refresh();
      warmApplicationsNavigation(router, { forceIndex: true });
    })();
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
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
        <Button type="submit">
          {mode.kind === "create" ? "Add application" : "Save changes"}
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
