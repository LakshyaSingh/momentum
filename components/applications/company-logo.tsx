"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { companyInitials, companyLogoApiUrl } from "@/lib/company-logo";
import { cn } from "@/lib/utils";

type CompanyLogoProps = {
  company: string;
  jobLink?: string | null;
  hiringOrgUrl?: string | null;
  companyDomain?: string | null;
  size?: "xs" | "sm" | "md";
  className?: string;
};

const SIZE_CLASS = {
  xs: "size-6 text-[10px]",
  sm: "size-7 text-[10px]",
  md: "size-8 text-xs",
} as const;

export function CompanyLogo({
  company,
  jobLink,
  hiringOrgUrl,
  companyDomain,
  size = "sm",
  className,
}: CompanyLogoProps) {
  const initials = useMemo(() => companyInitials(company), [company]);
  const logoSrc = useMemo(
    () =>
      company.trim()
        ? companyLogoApiUrl({ company, jobLink, hiringOrgUrl, companyDomain })
        : undefined,
    [company, jobLink, hiringOrgUrl, companyDomain],
  );

  return (
    <Avatar className={cn(SIZE_CLASS[size], "ring-1 ring-border/40 bg-background/60", className)}>
      {logoSrc ? (
        <AvatarImage src={logoSrc} alt="" className="object-contain p-1" />
      ) : null}
      <AvatarFallback delayMs={logoSrc ? 600 : 0}>{initials}</AvatarFallback>
    </Avatar>
  );
}
