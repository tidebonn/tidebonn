import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay } from 'date-fns';
import { nb } from 'date-fns/locale';

const DAY_MAP = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 0,
};

const DAY_NAMES_NO = {
  monday: 'mandag',
  tuesday: 'tirsdag',
  wednesday: 'onsdag',
  thursday: 'torsdag',
  friday: 'fredag',
  saturday: 'lørdag',
  sunday: 'søndag',
};

export default function SeriesStartDatePicker({ value, startDay, onChange }) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(value ? new Date(value) : today);
  const [open, setOpen] = useState(false);

  const targetWeekday = DAY_MAP[startDay] ?? 6; // default lørdag

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // First day of week offset (Mon=1 -> Mon as first col)
  const firstDayOfWeek = getDay(monthStart); // 0=Sun
  // Convert to Mon-first offset
  const offset = (firstDayOfWeek + 6) % 7;

  const selectedDate = value ? new Date(value) : null;

  const isAllowedDay = (date) => getDay(date) === targetWeekday;

  const handleSelect = (date) => {
    if (!isAllowedDay(date)) return;
    onChange(format(date, 'yyyy-MM-dd'));
    setOpen(false);
  };

  const displayValue = selectedDate
    ? format(selectedDate, 'EEEE d. MMMM yyyy', { locale: nb })
    : null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 border border-input rounded-md px-3 py-2 text-sm bg-white dark:bg-[#2A2A2A] hover:bg-[#F5F0EB] dark:hover:bg-[#3A3A3A] transition-colors text-left"
      >
        <Calendar className="w-4 h-4 text-[#6B9EA0] flex-shrink-0" />
        <span className={displayValue ? 'text-[#1A1A1A] dark:text-white capitalize' : 'text-[#9A9A9A]'}>
          {displayValue || `Velg en ${DAY_NAMES_NO[startDay] || 'startdato'}`}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 bg-white dark:bg-[#2A2A2A] border border-[#E8E0D8] dark:border-gray-700 rounded-xl shadow-xl p-4 min-w-[280px]">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewMonth(m => subMonths(m, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold capitalize text-[#1A1A1A] dark:text-white">
              {format(viewMonth, 'MMMM yyyy', { locale: nb })}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewMonth(m => addMonths(m, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Weekday headers (Mon-Sun) */}
          <div className="grid grid-cols-7 mb-1">
            {['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'].map(d => (
              <div key={d} className="text-center text-xs text-[#9A9A9A] py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {/* Empty offset cells */}
            {Array.from({ length: offset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map(date => {
              const allowed = isAllowedDay(date);
              const selected = selectedDate && isSameDay(date, selectedDate);
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => handleSelect(date)}
                  disabled={!allowed}
                  className={`
                    h-9 w-9 mx-auto rounded-full text-sm transition-colors flex items-center justify-center
                    ${selected ? 'bg-[#6B9EA0] dark:bg-[#BD7B59] text-white font-semibold' : ''}
                    ${allowed && !selected ? 'hover:bg-[#E8F4F4] text-[#1A1A1A] dark:text-white font-medium cursor-pointer' : ''}
                    ${!allowed ? 'text-[#C8C0B8] dark:text-gray-600 cursor-not-allowed' : ''}
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-[#9A9A9A] mt-3 text-center">
            Kun {DAY_NAMES_NO[startDay] || 'valgt ukedag'}er kan velges
          </p>
        </div>
      )}
    </div>
  );
}