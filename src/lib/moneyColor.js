/** Cores semânticas para valores monetários (independente do tema da UI). */
export const MONEY_POSITIVE = 'var(--money-positive)';
export const MONEY_NEGATIVE = 'var(--money-negative)';
export const MONEY_NEUTRAL = 'var(--text-main)';

export function moneyColor(value) {
  const n =
    typeof value === 'string'
      ? parseFloat(value.replace(/[^\d.,-]/g, '').replace(',', '.'))
      : Number(value);
  if (Number.isNaN(n) || n === 0) return MONEY_NEUTRAL;
  return n > 0 ? MONEY_POSITIVE : MONEY_NEGATIVE;
}
