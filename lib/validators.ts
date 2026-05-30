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
  .max(253)
  .optional()
  .transform((v) => (v && v.length > 0 ? normalizeCompanyDomain(v) : undefined))
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
