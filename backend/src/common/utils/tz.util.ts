export function getBarberTzOffsetHours(): number {
  const v = process.env.BARBER_TZ_OFFSET_HOURS;
  if (v !== undefined && v !== '') {
    const n = parseInt(v, 10);
    if (!isNaN(n)) return n;
  }
  return 3;
}

export function getLocalTodayRange(): { today: Date; tomorrow: Date } {
  const tzOffset = getBarberTzOffsetHours();
  const localTime = new Date(Date.now() - tzOffset * 60 * 60 * 1000);
  const year = localTime.getUTCFullYear();
  const month = localTime.getUTCMonth();
  const day = localTime.getUTCDate();
  
  const today = new Date(Date.UTC(year, month, day, tzOffset, 0, 0, 0));
  const tomorrow = new Date(Date.UTC(year, month, day + 1, tzOffset, 0, 0, 0));
  return { today, tomorrow };
}

export function getLocalMonthRange(): { startOfMonth: Date; endOfMonth: Date } {
  const tzOffset = getBarberTzOffsetHours();
  const localTime = new Date(Date.now() - tzOffset * 60 * 60 * 1000);
  const year = localTime.getUTCFullYear();
  const month = localTime.getUTCMonth();
  
  const startOfMonth = new Date(Date.UTC(year, month, 1, tzOffset, 0, 0, 0));
  const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23 + tzOffset, 59, 59, 999));
  return { startOfMonth, endOfMonth };
}
