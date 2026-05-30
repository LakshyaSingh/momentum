import { ApplicationStatus } from "@prisma/client";

export const SCHEMA_FIELDS = [
  "company",
  "role",
  "location",
  "jobLink",
  "applicationDate",
  "status",
  "salary",
  "recruiter",
  "recruiterEmail",
  "recruiterPhone",
  "referral",
  "referralEmail",
  "referralPhone",
  "notes",
  "followUpDate",
  "responseReceived",
  "interviewStage",
  "offerStatus",
  "_skip",
] as const;

export type SchemaField = (typeof SCHEMA_FIELDS)[number];

export const SCHEMA_LABELS: Record<SchemaField, string> = {
  company: "Company",
  role: "Role",
  location: "Location",
  jobLink: "Job link / URL",
  applicationDate: "Application date",
  status: "Status",
  salary: "Salary",
  recruiter: "Recruiter name",
  recruiterEmail: "Recruiter email",
  recruiterPhone: "Recruiter phone",
  referral: "Referral / contact name",
  referralEmail: "Referral / contact email",
  referralPhone: "Referral / contact phone",
  notes: "Notes",
  followUpDate: "Follow-up date",
  responseReceived: "Response received",
  interviewStage: "Interview stage",
  offerStatus: "Offer status",
  _skip: "Don't import",
};

/** Reserved key prefix used to attach the underlying URL of a hyperlinked cell. */
export const LINK_PREFIX = "__link__";

/** Reserved key used to track which workbook sheet a row came from. */
export const SHEET_KEY = "__sheet__";

/** Reserved key: 1-based row number in the source file (Excel row or CSV line). */
export const EXCEL_ROW_KEY = "__excelRow__";

/** Hint patterns used to auto-suggest mappings. Order matters — earlier hints win. */
const HEADER_HINTS: Record<Exclude<SchemaField, "_skip">, RegExp[]> = {
  // Specific (multi-word) hints first so e.g. "Recruiter Email" doesn't match "Recruiter".
  recruiterEmail: [/recruiter.*e[\-\s]?mail/i, /^recruiter\s*email/i],
  recruiterPhone: [/recruiter.*(phone|mobile|cell|tel)/i],
  referralEmail: [
    /(referr?al|reference|contact).*e[\-\s]?mail/i,
    /^contact\s*email/i,
  ],
  referralPhone: [
    /(referr?al|reference).*(phone|mobile|cell|tel)/i,
    /^contact\s*(phone|mobile|cell|tel)/i,
  ],

  company: [/^company(\s*name)?$/i, /\bcompany\b/i, /\bemployer\b/i, /\borg/i],
  role: [/^role$/i, /\bjob\s*role\b/i, /\bposition\b/i, /\btitle\b/i, /\brole\b/i],
  location: [/^location$/i, /\bcity\b/i, /\boffice\b/i, /\blocation\b/i],
  jobLink: [/posting.*url/i, /\bposting\b/i, /\burl\b/i, /\blink\b/i, /^link$/i],
  applicationDate: [/date\s*applied/i, /applied/i, /^date$/i, /\bsubmitted\b/i, /application.?date/i],
  status: [/^status$/i, /\bstage\b/i, /\bstate\b/i],
  salary: [/^salary$/i, /\bcomp\b/i, /\bcompensation\b/i, /\bpay\b/i],
  recruiter: [/^recruiter(\s*name)?$/i, /\brecruiter\b/i, /\bhiring\b/i],
  referral: [
    /^reference\s*contact(\s*name)?$/i,
    /^referr?al(\s*name)?$/i,
    /\brefer/i,
    /\breference\b/i,
  ],
  notes: [/^notes?$/i, /\bcomment\b/i, /\bdetails\b/i],
  followUpDate: [/follow.?up/i],
  responseReceived: [/response/i, /\bresponded\b/i, /\bheard.?back\b/i],
  interviewStage: [/interview.?stage/i, /\binterview\b/i],
  offerStatus: [/offer/i],
};

export function suggestMapping(headers: string[]): Record<string, SchemaField> {
  const mapping: Record<string, SchemaField> = {};
  const used = new Set<SchemaField>();
  for (const header of headers) {
    if (!header) {
      mapping[header] = "_skip";
      continue;
    }
    let best: SchemaField | null = null;
    for (const [field, patterns] of Object.entries(HEADER_HINTS) as [
      Exclude<SchemaField, "_skip">,
      RegExp[],
    ][]) {
      if (used.has(field)) continue;
      if (patterns.some((p) => p.test(header))) {
        best = field;
        break;
      }
    }
    mapping[header] = best ?? "_skip";
    if (best) used.add(best);
  }
  return mapping;
}

const STATUS_ALIASES: Record<string, ApplicationStatus> = {
  applied: "APPLIED",
  submitted: "APPLIED",
  oa: "OA",
  "online assessment": "OA",
  hackerrank: "OA",
  codesignal: "OA",
  "phone screen": "RECRUITER_SCREEN",
  "recruiter screen": "RECRUITER_SCREEN",
  recruiter: "RECRUITER_SCREEN",
  screen: "RECRUITER_SCREEN",
  interview: "INTERVIEW",
  technical: "INTERVIEW",
  onsite: "FINAL_ROUND",
  final: "FINAL_ROUND",
  "final round": "FINAL_ROUND",
  offer: "OFFER",
  rejected: "REJECTED",
  rejection: "REJECTED",
  ghosted: "GHOSTED",
  withdrawn: "WITHDRAWN",
  withdrew: "WITHDRAWN",
};

export function normalizeStatus(value: unknown): ApplicationStatus {
  if (typeof value !== "string") return "APPLIED";
  const k = value.trim().toLowerCase();
  if (k in STATUS_ALIASES) return STATUS_ALIASES[k]!;
  // try direct enum
  const upper = k.toUpperCase().replace(/\s+/g, "_");
  if ((["APPLIED", "OA", "RECRUITER_SCREEN", "INTERVIEW", "FINAL_ROUND", "OFFER", "REJECTED", "GHOSTED", "WITHDRAWN"] as const).includes(upper as ApplicationStatus)) {
    return upper as ApplicationStatus;
  }
  return "APPLIED";
}

export type DateFormat = "DDMM" | "MMDD";

/**
 * Robust date parser. Handles:
 * - JS Date instances (already-typed Excel cells when cellDates: true)
 * - Excel serial numbers (≈ days since 1900)
 * - DD/MM/YY, DD/MM/YYYY when `prefer` is "DDMM" (default — most non-US sheets)
 * - MM/DD/YYYY when `prefer` is "MMDD" (US convention)
 * - Either format gets disambiguated when one part is unambiguous (>12)
 * - Native Date.parse fallback for ISO and verbose strings
 */
function parseDateLike(
  value: unknown,
  prefer: DateFormat = "DDMM",
): Date | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value;
  if (typeof value === "number") {
    // SheetJS Excel serial → JS Date
    const ms = Math.round((value - 25569) * 86_400_000);
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d;
  }
  const s = String(value).trim();
  if (!s) return undefined;

  // dd/mm/yy, dd-mm-yy, dd.mm.yyyy etc.
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const a = parseInt(m[1]!, 10);
    const b = parseInt(m[2]!, 10);
    let year = parseInt(m[3]!, 10);
    // Year handling:
    //   < 50      → 20xx
    //   50–99     → 19xx
    //   100–999   → typo (e.g. "126" meant "2026"); reject so the row flags an error
    //   1000+     → as-is
    if (year < 50) year += 2000;
    else if (year < 100) year += 1900;
    else if (year < 1000) return undefined;

    let day: number;
    let month: number;
    if (a > 12 && b <= 12) {
      day = a;
      month = b;
    } else if (b > 12 && a <= 12) {
      day = b;
      month = a;
    } else {
      // Both ≤ 12 — ambiguous. Use the user-chosen convention.
      if (prefer === "MMDD") {
        month = a;
        day = b;
      } else {
        day = a;
        month = b;
      }
    }
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const d = new Date(year, month - 1, day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Native Date as a fallback (handles ISO, "May 21 2026", etc.)
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  return undefined;
}

function parseBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return false;
  return /^(yes|y|true|1)$/i.test(value.trim());
}

function joinContact(parts: (string | undefined)[]): string | undefined {
  const cleaned = parts.map((p) => p?.trim()).filter((p): p is string => Boolean(p));
  if (cleaned.length === 0) return undefined;
  return cleaned.join(" · ");
}

export interface NormalizedRow {
  company: string;
  role: string;
  location?: string;
  jobLink?: string;
  applicationDate?: Date;
  status: ApplicationStatus;
  salary?: string;
  recruiter?: string;
  referral?: string;
  notes?: string;
  followUpDate?: Date;
  responseReceived: boolean;
  interviewStage?: string;
  offerStatus?: string;
  _errors: string[];
  /** Index in the filtered import batch (stable key for manual fixes). */
  _sourceIndex: number;
  /** 1-based row number in the spreadsheet, when available. */
  _excelRow?: number;
  /** Workbook sheet name, when available. */
  _sheet?: string;
}

export function computeImportErrors(
  row: Pick<NormalizedRow, "company" | "role" | "applicationDate">,
): string[] {
  const errors: string[] = [];
  if (!row.company?.trim()) errors.push("Missing company");
  if (!row.role?.trim()) errors.push("Missing role");
  if (!row.applicationDate) errors.push("Missing or unparseable date");
  return errors;
}

/** Apply a manual fix patch and recompute validation errors. */
export function mergeImportRow(
  base: NormalizedRow,
  patch: Partial<NormalizedRow>,
): NormalizedRow {
  const merged = { ...base, ...patch };
  merged._errors = computeImportErrors(merged);
  return merged;
}

export function normalizeRow(
  raw: Record<string, unknown>,
  mapping: Record<string, SchemaField>,
  dateFormat: DateFormat = "DDMM",
): NormalizedRow {
  const out: NormalizedRow = {
    company: "",
    role: "",
    status: "APPLIED",
    responseReceived: false,
    _errors: [],
    _sourceIndex: -1,
  };

  // Buffers for the composite recruiter / referral fields.
  let recruiterName: string | undefined;
  let recruiterEmail: string | undefined;
  let recruiterPhone: string | undefined;
  let referralName: string | undefined;
  let referralEmail: string | undefined;
  let referralPhone: string | undefined;

  for (const [header, field] of Object.entries(mapping)) {
    if (field === "_skip") continue;
    const value = raw[header];
    switch (field) {
      case "company":
        out.company = String(value ?? "").trim();
        break;
      case "role":
        out.role = String(value ?? "").trim();
        break;
      case "location":
        out.location = String(value ?? "").trim() || undefined;
        break;
      case "jobLink": {
        // Prefer the underlying hyperlink target if the cell was a hyperlink.
        const link = raw[`${LINK_PREFIX}${header}`];
        const text = String(value ?? "").trim();
        if (typeof link === "string" && /^https?:/i.test(link)) {
          out.jobLink = link;
        } else if (/^https?:\/\//i.test(text)) {
          out.jobLink = text;
        } else if (text && text.length < 2048) {
          // Keep the descriptive text — the schema accepts any string. The detail
          // page will render it as plain text rather than a clickable link.
          out.jobLink = text;
        }
        break;
      }
      case "applicationDate":
        out.applicationDate = parseDateLike(value, dateFormat);
        break;
      case "status":
        out.status = normalizeStatus(value);
        break;
      case "salary":
        out.salary =
          value !== undefined && value !== null
            ? String(value).trim() || undefined
            : undefined;
        break;
      case "recruiter":
        recruiterName = String(value ?? "").trim() || undefined;
        break;
      case "recruiterEmail":
        recruiterEmail = String(value ?? "").trim() || undefined;
        break;
      case "recruiterPhone":
        recruiterPhone = String(value ?? "").trim() || undefined;
        break;
      case "referral":
        referralName = String(value ?? "").trim() || undefined;
        break;
      case "referralEmail":
        referralEmail = String(value ?? "").trim() || undefined;
        break;
      case "referralPhone":
        referralPhone = String(value ?? "").trim() || undefined;
        break;
      case "notes":
        out.notes = String(value ?? "").trim() || undefined;
        break;
      case "followUpDate":
        out.followUpDate = parseDateLike(value, dateFormat);
        break;
      case "responseReceived":
        out.responseReceived = parseBool(value);
        break;
      case "interviewStage":
        out.interviewStage = String(value ?? "").trim() || undefined;
        break;
      case "offerStatus":
        out.offerStatus = String(value ?? "").trim() || undefined;
        break;
    }
  }

  out.recruiter = joinContact([recruiterName, recruiterEmail, recruiterPhone]);
  out.referral = joinContact([referralName, referralEmail, referralPhone]);

  out._errors = computeImportErrors(out);

  return out;
}
