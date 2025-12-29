/**
 * Formátuje číselnú hodnotu na menu
 * @param value Hodnota na formátovanie
 * @param currency Mena (default: EUR)
 * @param locale Lokalizácia (default: sk-SK)
 * @returns Formátovaná mena s 2 desatinnými miestami
 */
export const formatCurrency = (
  value: number,
  currency: string = "EUR",
  locale: string = "sk-SK"
): string => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Formátuje hodiny s presnosťou na 3 desatinné miesta (výpočet)
 * a zobrazuje 2 desatinné miesta
 * @param hours Počet hodín
 * @returns Formátované hodiny s "h" sufixom
 */
export const formatHours = (hours: number): string => {
  // Zaokrúhli na 3 desatinné miesta pre výpočty
  const rounded = Math.round(hours * 1000) / 1000;
  // Zobraz 2 desatinné miesta
  return `${rounded.toFixed(2)} h`;
};

