"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { syncBrowserTimezone } from "@/app/actions/user";
import { DEFAULT_TIMEZONE, getBrowserTimezone } from "@/lib/timezone";

/**
 * On first authenticated visit, copy the browser's IANA timezone into the user
 * profile when they still have the server default (UTC). Settings remain the
 * override if the user picks a different zone later.
 */
export function TimezoneSync({ timezone }: { timezone: string }) {
  const router = useRouter();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || timezone !== DEFAULT_TIMEZONE) return;

    const detected = getBrowserTimezone();
    if (!detected || detected === DEFAULT_TIMEZONE) return;

    attempted.current = true;
    void syncBrowserTimezone(detected).then((res) => {
      if (res.ok) router.refresh();
    });
  }, [timezone, router]);

  return null;
}
