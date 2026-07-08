import type { ApplicationRow } from "@/components/applications/data-table";
import { responseReceivedForStatus } from "@/lib/response-received";
import type { ApplicationInput } from "@/lib/validators";

export function applicationRowToFormDefaults(row: ApplicationRow): Partial<ApplicationInput> {
  return {
    company: row.company,
    companyDomain: row.companyDomain ?? undefined,
    role: row.role,
    location: row.location ?? undefined,
    jobLink: row.jobLink ?? undefined,
    applicationDate: new Date(row.applicationDate),
    status: row.status,
    salary: row.salary ?? undefined,
    recruiter: row.recruiter ?? undefined,
    referral: row.referral ?? undefined,
    notes: row.notes ?? undefined,
    followUpDate: row.followUpDate ? new Date(row.followUpDate) : null,
    interviewStage: row.interviewStage ?? undefined,
    offerStatus: row.offerStatus ?? undefined,
  };
}

export function applicationInputToRowPatch(
  values: Partial<ApplicationInput>,
): Partial<ApplicationRow> {
  return {
    ...(values.company !== undefined ? { company: values.company } : {}),
    ...(values.companyDomain !== undefined ? { companyDomain: values.companyDomain ?? null } : {}),
    ...(values.role !== undefined ? { role: values.role } : {}),
    ...(values.location !== undefined ? { location: values.location ?? null } : {}),
    ...(values.jobLink !== undefined ? { jobLink: values.jobLink ?? null } : {}),
    ...(values.applicationDate !== undefined
      ? { applicationDate: values.applicationDate.toISOString() }
      : {}),
    ...(values.status !== undefined
      ? {
          status: values.status,
          responseReceived: responseReceivedForStatus(values.status),
        }
      : {}),
    ...(values.salary !== undefined ? { salary: values.salary ?? null } : {}),
    ...(values.recruiter !== undefined ? { recruiter: values.recruiter ?? null } : {}),
    ...(values.referral !== undefined ? { referral: values.referral ?? null } : {}),
    ...(values.notes !== undefined ? { notes: values.notes ?? null } : {}),
    ...(values.followUpDate !== undefined
      ? { followUpDate: values.followUpDate?.toISOString() ?? null }
      : {}),
    ...(values.interviewStage !== undefined
      ? { interviewStage: values.interviewStage ?? null }
      : {}),
    ...(values.offerStatus !== undefined ? { offerStatus: values.offerStatus ?? null } : {}),
  };
}
