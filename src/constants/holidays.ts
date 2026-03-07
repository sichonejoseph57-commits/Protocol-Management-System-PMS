import { ZambianHoliday } from '@/types';

// Zambian Public Holidays 2026
export const ZAMBIAN_HOLIDAYS_2026: ZambianHoliday[] = [
  { date: '2026-01-01', name: "New Year's Day", type: 'public' },
  { date: '2026-03-08', name: 'International Women\'s Day', type: 'public' },
  { date: '2026-03-12', name: 'Youth Day', type: 'public' },
  { date: '2026-04-03', name: 'Good Friday', type: 'public' },
  { date: '2026-04-04', name: 'Holy Saturday', type: 'public' },
  { date: '2026-05-01', name: 'Labour Day', type: 'public' },
  { date: '2026-05-25', name: 'Africa Freedom Day', type: 'public' },
  { date: '2026-07-06', name: 'Heroes Day', type: 'public' },
  { date: '2026-07-07', name: 'Unity Day', type: 'public' },
  { date: '2026-08-03', name: 'Farmers\' Day', type: 'public' },
  { date: '2026-10-24', name: 'Independence Day', type: 'public' },
  { date: '2026-12-25', name: 'Christmas Day', type: 'public' },
];

export const isZambianHoliday = (date: string): ZambianHoliday | null => {
  return ZAMBIAN_HOLIDAYS_2026.find(h => h.date === date) || null;
};

export const getHolidayOvertimeRate = (): number => {
  return 2.0; // Double pay for holidays as per Zambian labor standards
};
