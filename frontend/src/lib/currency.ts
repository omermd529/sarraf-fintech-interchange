const sarFormatter = new Intl.NumberFormat("en-SA", {
  style: "currency",
  currency: "SAR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatSAR(value: string | number): string {
  return sarFormatter.format(Number(value));
}
