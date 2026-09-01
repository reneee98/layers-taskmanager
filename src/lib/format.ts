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
 * Formátuje desatinné hodiny ako trvanie HH:MM.
 * @param hours Počet hodín
 * @returns Trvanie zaokrúhlené na najbližšiu minútu
 */
export const formatHours = (hours: number): string => {
  if (!Number.isFinite(hours)) return "00:00";

  const totalMinutes = Math.round(Math.abs(hours) * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const sign = hours < 0 && totalMinutes > 0 ? "-" : "";

  return `${sign}${wholeHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};
