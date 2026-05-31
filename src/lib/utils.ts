export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// Produces a stable key for a person's name regardless of whether the first
// name is given as an initial ("p.schiergen") or in full ("peter schiergen").
// Key format: {first_initial}{last_name_alphanumeric}.
export function canonicalPersonKey(name: string): string {
  const trimmed = name.trim();

  // "p.schiergen" or "J.O.Brien" — initial(s) then dot then surname
  const dotMatch = trimmed.match(/^([a-zA-Z])\.(.+)$/);
  if (dotMatch) {
    const initial = dotMatch[1].toLowerCase();
    const lastName = dotMatch[2].toLowerCase().replace(/[^a-z0-9]/g, "");
    return `${initial}${lastName}`;
  }

  // "peter schiergen" or "peter von schiergen"
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    const initial = parts[0][0].toLowerCase();
    const lastName = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, "");
    return `${initial}${lastName}`;
  }

  return trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Returns true for abbreviated names like "p.schiergen" where the first name
// is only an initial — used to avoid overwriting a full name with an initial.
export function isAbbreviatedName(name: string): boolean {
  return /^[a-zA-Z]{1,2}\./.test(name.trim());
}
