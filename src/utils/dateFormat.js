/**
 * Format a date string or Date for display: DD.MM.YYYY (two digits day/month, four year).
 * @param {string|Date} dateInput - ISO date string (e.g. YYYY-MM-DD) or Date instance
 * @returns {string} e.g. "07.03.2025"
 */
export function formatDateUniform(dateInput) {
  if (dateInput == null) return '—';
  const d = typeof dateInput === 'string' ? new Date(String(dateInput).substring(0, 10)) : dateInput;
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}
