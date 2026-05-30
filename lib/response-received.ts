import { ApplicationStatus } from "@prisma/client";

/** True when status implies the company has responded (anything except Applied or Ghosted). */
export function responseReceivedForStatus(status: ApplicationStatus): boolean {
  return status !== ApplicationStatus.APPLIED && status !== ApplicationStatus.GHOSTED;
}
