"use server";

import { ApplicationStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import type { ApplicationInput } from "@/lib/validators";
import {
  createApplicationForUser,
  deleteApplicationForUser,
  transitionStatusForUser,
  updateApplicationForUser,
  type CreateApplicationResult,
} from "@/lib/applications/service";

export async function createApplication(
  input: ApplicationInput,
): Promise<CreateApplicationResult> {
  const user = await requireUser();
  return createApplicationForUser(user.id, user.timezone, input);
}

export async function updateApplication(
  input: { id: string } & Partial<ApplicationInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  return updateApplicationForUser(user.id, input);
}

export async function deleteApplication(id: string) {
  const user = await requireUser();
  await deleteApplicationForUser(user.id, id);
  return { ok: true } as const;
}

export async function transitionStatus(id: string, status: ApplicationStatus) {
  const user = await requireUser();
  return transitionStatusForUser(user.id, id, status);
}
