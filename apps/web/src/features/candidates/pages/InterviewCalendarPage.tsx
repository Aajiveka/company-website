import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/axios';
import { cn } from '@/lib/cn';
import { Badge, Breadcrumbs, Button, Card, Skeleton } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';

interface Interview {
  interviewId: number;
  time: string;
  company: string;
  designation: string;
  mode: string;
  location: string;
}

interface CalendarDay {
  date: string;
  interviews: Interview[];
}

const MODE_TONE: Record<string, BadgeTone> = {
  video: 'green',
  'in-person': 'blue',
  phone: 'amber',
};

function modeTone(mode: string): BadgeTone {
  return MODE_TONE[mode.toLowerCase()] ?? 'gray';
}

function formatMonthParam(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

export default function InterviewCalendarPage() {
  const { t } = useTranslation('dashboard');
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthParam = formatMonthParam(viewYear, viewMonth);

  const { data: calendarDays, isLoading } = useQuery<CalendarDay[]>({
    queryKey: ['interview-calendar', monthParam],
    queryFn: async () => {
      const res = await api.get('/candidates/me/interviews/calendar', {
        params: { month: monthParam },
      });
      return res.data;
    },
  });

  const interviewsByDate = useMemo(() => {
    const map = new Map<string, Interview[]>();
    calendarDays?.forEach((day) => {
      if (day.interviews.length > 0) {
        map.set(day.date, day.interviews);
      }
    });
    return map;
  }, [calendarDays]);

  const selectedInterviews = selectedDate ? interviewsByDate.get(selectedDate) ?? [] : [];

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const startDay = firstDayOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const totalCells = Math.ceil((startDay + daysInMonth) / 7) * 7;

  const goToPreviousMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
    setSelectedDate(null);
  };

  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(null);
  };

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const weekDays = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2024, 0, i); // Jan 2024 starts on Monday; 0=Sun
      return formatter.format(d);
    });
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumbs
        items={[
          { label: t('common:dashboard'), to: '/candidate/profile' },
          { label: t('interviewCalendar.heading') },
        ]}
      />
      <h1 className="mb-6 font-heading text-2xl font-bold text-navy">
        {t('interviewCalendar.heading')}
      </h1>

      {isLoading ? (
        <CalendarSkeleton />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousMonth}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label={t('interviewCalendar.previousMonth')}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="min-w-[10rem] text-center font-heading text-lg font-semibold text-navy">
                {monthLabel}
              </h2>
              <button
                onClick={goToNextMonth}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label={t('interviewCalendar.nextMonth')}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <Button variant="secondary" onClick={goToToday}>
              {t('interviewCalendar.today')}
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="grid grid-cols-7">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="border-b border-gray-200 bg-gray-50 py-2 text-center text-xs font-semibold uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {Array.from({ length: totalCells }, (_, i) => {
                const dayNum = i - startDay + 1;
                const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;
                if (!isCurrentMonth) {
                  return (
                    <div
                      key={`empty-${i}`}
                      className="min-h-[5rem] border-b border-r border-gray-100 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-900/30"
                    />
                  );
                }

                const cellDate = new Date(viewYear, viewMonth, dayNum);
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isToday = isSameDay(cellDate, today);
                const isPast = cellDate < today && !isToday;
                const dayInterviews = interviewsByDate.get(dateStr) ?? [];
                const hasInterviews = dayInterviews.length > 0;
                const isSelected = selectedDate === dateStr;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => hasInterviews ? setSelectedDate(isSelected ? null : dateStr) : undefined}
                    className={cn(
                      'relative min-h-[5rem] border-b border-r border-gray-100 p-1.5 text-left transition dark:border-gray-700',
                      isPast && 'text-gray-400 dark:text-gray-500',
                      hasInterviews && 'cursor-pointer hover:bg-primary/5',
                      !hasInterviews && 'cursor-default',
                      isSelected && 'bg-primary/10',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
                        isToday && 'ring-2 ring-primary ring-offset-1 dark:ring-offset-gray-800',
                        isSelected && 'bg-primary text-white',
                      )}
                    >
                      {dayNum}
                    </span>
                    {hasInterviews && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {dayInterviews.slice(0, 3).map((iv) => (
                          <span
                            key={iv.interviewId}
                            className={cn(
                              'block h-2 w-2 rounded-full',
                              modeTone(iv.mode) === 'green' && 'bg-green-500',
                              modeTone(iv.mode) === 'blue' && 'bg-blue-500',
                              modeTone(iv.mode) === 'amber' && 'bg-amber-500',
                              modeTone(iv.mode) === 'gray' && 'bg-gray-400',
                            )}
                          />
                        ))}
                        {dayInterviews.length > 3 && (
                          <span className="text-[10px] leading-none text-gray-500">
                            +{dayInterviews.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDate && selectedInterviews.length > 0 && (
            <section>
              <h3 className="mb-3 font-heading text-base font-semibold text-navy">
                {t('interviewCalendar.interviewsOn', {
                  date: new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  }),
                })}
              </h3>
              <div className="space-y-3">
                {selectedInterviews.map((iv) => (
                  <Card key={iv.interviewId} className="transition hover:shadow-md">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-heading text-base font-semibold text-navy">
                          {iv.designation}
                        </h4>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          {iv.company}
                        </p>
                      </div>
                      <Badge tone={modeTone(iv.mode)}>{iv.mode}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" aria-hidden />
                        {iv.time}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" aria-hidden />
                        {iv.location}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
