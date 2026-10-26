/** Accepts 05XXXXXXXX, 5XXXXXXXX, 9665XXXXXXXX or +9665XXXXXXXX; returns +9665XXXXXXXX. */
export function normalizeSaudiMobile(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "").replace(/^00/, "");
  const local = digits.startsWith("966") ? digits.slice(3) : digits.replace(/^0/, "");
  return /^5\d{8}$/.test(local) ? `+966${local}` : null;
}
