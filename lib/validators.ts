import { z } from "zod";
import { ApplicationStatus } from "@prisma/client";
import { isAtsVendorDomain, isValidCompanyDomain, normalizeCompanyDomain } from "@/lib/company-logo";

// Each optional field ends in `.optional()` again after its transform: in zod 4
// a transform's output is a required key, so without it every blank field
// would become a required `string | undefined` in the inferred type.
const optionalString = (max = 500) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .optional();

const optionalUrl = z
  .string()
  .max(2048)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))
  .refine((v) => !v || /^https?:\/\//i.test(v), { message: "Must start with http(s)://" })
  .optional();

/** A job-board URL with a path — a posting link, not a company's domain. */
function isJobBoardLink(value: string): boolean {
  const raw = value.trim();
  if (!isAtsVendorDomain(raw)) return false;
  try {
    const { pathname } = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return pathname.replace(/\/+$/, "") !== "";
  } catch {
    return false;
  }
}

const optionalCompanyDomain = z
  .string()
  .max(2048)
  .optional()
  // A job board's own domain is allowed: the user typed it, and the company may
  // be the job board itself (applying to LinkedIn → linkedin.com). What is
  // still caught is a whole job-board *link* pasted into this field — the
  // common mistake the old blanket rule existed for.
  .refine((v) => !v || !isJobBoardLink(v), {
    message: "That looks like a job link. Enter just the domain, like linkedin.com",
  })
  .transform((v) => (v === undefined ? undefined : normalizeCompanyDomain(v)))
  .refine((v) => !v || isValidCompanyDomain(v), { message: "Enter a valid domain" })
  .optional();

// Required strings name their own message for the missing case too: an
// untouched field is `undefined`, and zod 4's built-in wording for that is
// "Invalid input: expected string, received undefined".
export const ApplicationSchema = z.object({
  company: z.string({ error: "Company is required" }).min(1, "Company is required").max(120),
  companyDomain: optionalCompanyDomain,
  role: z.string({ error: "Role is required" }).min(1, "Role is required").max(160),
  location: optionalString(120),
  jobLink: optionalUrl,
  applicationDate: z.coerce.date({ message: "Pick a date" }),
  status: z.nativeEnum(ApplicationStatus).default(ApplicationStatus.APPLIED),
  salary: optionalString(80),
  recruiter: optionalString(120),
  referral: optionalString(160),
  notes: optionalString(2000),
  followUpDate: z.coerce.date().nullable().optional(),
  interviewStage: optionalString(120),
  offerStatus: optionalString(120),
});

export type ApplicationInput = z.infer<typeof ApplicationSchema>;

// `status` is redeclared without its default. In zod 4 a default still fills in
// a missing key even under `.partial()`, so an update that only touched, say,
// the location would reset the status to APPLIED and log a bogus status event.
export const ApplicationUpdateSchema = ApplicationSchema.partial().extend({
  id: z.string().min(1),
  status: z.nativeEnum(ApplicationStatus).optional(),
});
export type ApplicationUpdate = z.infer<typeof ApplicationUpdateSchema>;

/**
 * A job saved to the queue but not yet applied to.
 *
 * Unlike ApplicationSchema, company and role are optional: capture writes the
 * row the instant a link is pasted, and the page parse fills those in a moment
 * later. They become required again at promotion time — applyQueuedJob refuses
 * a row that cannot satisfy ApplicationSchema, and the UI opens the prefilled
 * form instead. jobLink is required; a queue entry with no link is not
 * actionable.
 */
export const QueuedJobSchema = z.object({
  jobLink: z
    .string()
    .min(1, "Job link is required")
    .max(2048)
    .refine((v) => /^https?:\/\//i.test(v), { message: "Must start with http(s)://" }),
  company: optionalString(120),
  companyDomain: optionalCompanyDomain,
  role: optionalString(160),
  location: optionalString(120),
  salary: optionalString(80),
  notes: optionalString(2000),
});

export type QueuedJobInput = z.infer<typeof QueuedJobSchema>;

export const QueuedJobUpdateSchema = QueuedJobSchema.partial().extend({
  id: z.string().min(1),
});
export type QueuedJobUpdate = z.infer<typeof QueuedJobUpdateSchema>;
