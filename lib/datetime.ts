// Date/time helpers for UstaadHub class scheduling.
//
// `scheduled_at` on public.class_sessions is stored as timestamptz (always UTC
// in Postgres). The teacher UI uses <input type="datetime-local"> which yields
// "YYYY-MM-DDTHH:mm" as an Asia/Kolkata wall-clock value (the timezone the UI
// is labelled with and the timezone students see). Both helpers convert
// between that wall-clock value and the stored UTC instant so the displayed
// time never shifts across a save/edit round trip.

const ASIA_KOLKATA_OFFSET_SECONDS = 5 * 3600 + 30 * 60; // +05:30 (no DST)

/**
 * Convert a datetime-local value ("YYYY-MM-DDTHH:mm", Asia/Kolkata wall-clock)
 * into an ISO 8601 UTC timestamp for storage in timestamptz.
 * Returns null for empty or invalid input.
 */
export function toIsoTimestamp(datetimeLocalValue: string | null | undefined): string | null {
  if (!datetimeLocalValue) return null;
  const trimmed = datetimeLocalValue.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) return null;

  const [datePart, timePart] = trimmed.split("T") as [string, string];
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  // Build the wall-clock value in UTC fields so JS normalises it, then verify
  // the components round-trip. This rejects impossible dates such as Feb 31
  // (Date.UTC silently rolls them over to March).
  const wall = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  if (Number.isNaN(wall.getTime())) return null;
  if (
    wall.getUTCFullYear() !== year ||
    wall.getUTCMonth() + 1 !== month ||
    wall.getUTCDate() !== day
  ) {
    return null;
  }

  // The wall-clock time is Asia/Kolkata (+05:30), so the UTC instant is the
  // wall-clock value minus 5h30m.
  return new Date(wall.getTime() - ASIA_KOLKATA_OFFSET_SECONDS * 1000).toISOString();
}

/**
 * Parse a stored timestamptz (UTC instant) into a datetime-local value
 * ("YYYY-MM-DDTHH:mm") in Asia/Kolkata time, preserving the intended local
 * time when the picker is reopened for editing. Returns null for empty or
 * unparseable input.
 */
export function toLocalDatetimeLocal(value: string | null | undefined): string | null {
  if (!value) return null;

  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;

  // Shift the UTC instant into Asia/Kolkata (+05:30) and read the wall-clock
  // components with the UTC getters. India has no DST, so a fixed offset is
  // always correct.
  const ist = new Date(dt.getTime() + ASIA_KOLKATA_OFFSET_SECONDS * 1000);

  const year = ist.getUTCFullYear();
  const month = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const day = String(ist.getUTCDate()).padStart(2, "0");
  const hour = String(ist.getUTCHours()).padStart(2, "0");
  const minute = String(ist.getUTCMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}
