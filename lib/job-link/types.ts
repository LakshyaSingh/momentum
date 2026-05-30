export type ParsedJobFields = {
  company?: string;
  role?: string;
  location?: string;
  salary?: string;
  recruiter?: string;
  notes?: string;
  hiringOrgUrl?: string;
};

export type ParseJobSource =
  | "json-ld"
  | "rippling"
  | "microdata"
  | "dom"
  | "embedded-json"
  | "linkedin"
  | "open-graph"
  | "meta"
  | "title"
  | "url"
  | "text";

export type ParseJobSuccess = {
  ok: true;
  fields: ParsedJobFields;
  source: ParseJobSource;
  warning?: string;
};

export type ParseJobFailure = {
  ok: false;
  error: string;
};

export type ParseJobResult = ParseJobSuccess | ParseJobFailure;

export type FieldLayer = {
  fields: ParsedJobFields;
  source: ParseJobSource;
};
