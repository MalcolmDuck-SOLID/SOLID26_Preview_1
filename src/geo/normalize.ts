export function normalizeCityName(city: string): string {
  if (!city) return '';
  return city
    .toLowerCase()
    .normalize('NFD') // Decompose combined characters
    .replace(/\p{Diacritic}/gu, '') // Remove diacritics
    .trim();
}
