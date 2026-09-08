/**
 * Helper utilities and column alias dictionaries for parsing Event Logs (CSV, Excel, XES).
 */

export function normalizeColName(str: string): string {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/['"’`\s_\-./\\():[\]{}]/g, "");
}

export function parseFlexibleDate(raw: unknown): string | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d.toISOString();

  const dmyMatch = trimmed.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[\sT]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  );
  if (dmyMatch) {
    const [, day, month, year, h = "0", m = "0", s = "0"] = dmyMatch;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(h),
      Number(m),
      Number(s),
    );
    if (!isNaN(parsed.getTime())) return parsed.toISOString();
  }

  const ymdMatch = trimmed.match(
    /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[\sT]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  );
  if (ymdMatch) {
    const [, year, month, day, h = "0", m = "0", s = "0"] = ymdMatch;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(h),
      Number(m),
      Number(s),
    );
    if (!isNaN(parsed.getTime())) return parsed.toISOString();
  }

  return null;
}

export const ALIAS_GROUPS = {
  case: [
    "caseid",
    "case",
    "traceid",
    "trace",
    "id",
    "caseno",
    "macase",
    "mahosor",
    "sohosor",
    "sohoso",
    "maquytrinh",
    "casecode",
    "case_id",
  ],
  act: [
    "activity",
    "activityname",
    "conceptname",
    "task",
    "action",
    "event",
    "step",
    "taskname",
    "tentask",
    "tencongviec",
    "congviec",
    "hoatdong",
    "tenhoatdong",
    "nhiemvu",
    "buoc",
    "tenbuoc",
  ],
  res: [
    "personsname",
    "personname",
    "person",
    "performer",
    "performername",
    "executor",
    "nguoithuchien",
    "tennguoithuchien",
    "nhanvien",
    "tennhanvien",
    "resource",
    "resourcename",
    "orgresource",
    "user",
    "username",
    "role",
    "vaitro",
    "bophan",
    "thuchien",
    "assignee",
  ],
  start: [
    "starttimestamp",
    "start",
    "starttime",
    "timestamp",
    "date",
    "thoigianbatdau",
    "ngaybatdau",
    "giobatdau",
    "batdau",
    "startdate",
  ],
  end: [
    "completetimestamp",
    "complete",
    "endtime",
    "end",
    "thoigianketthuc",
    "thoigianhoanthanh",
    "ngayketthuc",
    "gioketthuc",
    "ketthuc",
    "hoanthanh",
    "enddate",
  ],
  dur: [
    "duration",
    "leadtime",
    "time",
    "thoigianthucte",
    "thoigianthuctephut",
    "thoiluong",
    "actualduration",
    "sogio",
    "thoigian",
  ],
  cost: ["cost", "price", "expense", "amount", "chiphi", "chiphithucte", "gia", "sotien"],
  task: ["taskid", "taskcode", "task_id", "matask", "macongviec", "macv"],
  benchmark: [
    "benchmarkduration",
    "benchmark",
    "dinhmuc",
    "dinhmucphut",
    "thoigiandinhmuc",
    "muctieu",
    "sla",
    "standardtime",
    "targetduration",
  ],
  status: ["slastatus", "ketqua", "trangthai", "tuanthu", "result", "status"],
};
