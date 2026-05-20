// src/lib/utils/date.ts

export function getDaysBetween(startDate: string, endDate: string): Date[] {
  const dates: Date[] = [];
  // Normalize input strings to YYYY-MM-DD to ensure safe local parsing
  const start = startDate.split('T')[0];
  const end = endDate.split('T')[0];
  
  let curr = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  
  if (isNaN(curr.getTime()) || isNaN(last.getTime())) return [];

  while (curr <= last) {
    dates.push(new Date(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

export function formatDate(date: Date): string {
  if (!date || isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(date: Date): string {
  if (!date || isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatStringDate(dateStr: string): string {
  if (!dateStr) return '';
  const normalized = dateStr.split('T')[0];
  const date = new Date(normalized + 'T00:00:00');
  return formatDisplayDate(date);
}
