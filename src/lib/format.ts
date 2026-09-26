const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

const timeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  hour: '2-digit',
  minute: '2-digit',
});

const moneyFormat = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

function tidy(value: string) {
  return value.replace(',', '');
}

export function formatDateTime(iso: string) {
  return tidy(dateTimeFormat.format(new Date(iso)));
}

export function formatDate(iso: string) {
  return tidy(dateFormat.format(new Date(iso)));
}

export function formatTime(iso: string) {
  return timeFormat.format(new Date(iso));
}

export function formatMoney(value: number) {
  return moneyFormat.format(value);
}

export function formatPercent(share: number) {
  return `${Math.round(share * 100)}%`;
}

export function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function formatScore(value: number) {
  return value.toFixed(2);
}

export function formatDuration(start: string, end: string) {
  const minutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (minutes < 1) return 'Under a minute';
  if (minutes === 1) return '1 minute';
  return `${minutes} minutes`;
}
