import { z } from "zod";
import { ApplicationStatus } from "@prisma/client";
import { isAtsVendorDomain, isValidCompanyDomain, normalizeCompanyDomain } from "@/lib/company-logo";

const optionalString = (max = 500) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined));

const optionalUrl = z
  .string()
  .max(2048)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))
  .refine((v) => !v || /^https?:\/\//i.test(v), { message: "Must start with http(s)://" });

const optionalCompanyDomain = z
  .string()
  .max(2048)
  .optional()
  .refine((v) => !v || !isAtsVendorDomain(v), {
    message: "Use the company domain, not the job board domain",
  })
  .transform((v) => (v === undefined ? undefined : normalizeCompanyDomain(v)))
  .refine((v) => !v || isValidCompanyDomain(v), { message: "Enter a valid domain" })
  .refine((v) => !v || !isAtsVendorDomain(v), {
    message: "Use the company domain, not the job board domain",
  });

export const ApplicationSchema = z.object({
  company: z.string().min(1, "Company is required").max(120),
  companyDomain: optionalCompanyDomain,
  role: z.string().min(1, "Role is required").max(160),
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

export const ApplicationUpdateSchema = ApplicationSchema.partial().extend({
  id: z.string().min(1),
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
