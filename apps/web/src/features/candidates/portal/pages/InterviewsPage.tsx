import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarPlus, ChevronLeft, ChevronRight, MapPin, Phone, Video } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppliedJobs } from '../../candidate.api';
import type { AppliedJob } from '../../candidate.types';
import { ModuleHeader, Tabs } from '../components/ModuleFrame';
import { Card, CardBody, EmptyState, ErrorState, InitialAvatar, Pill, SkeletonRows } from '../components/primitives';
import { avatarTone, dotted, longDate } from '../format';
import { statusView } from '../applicationStatus';

type TabKey = 'upcoming' | 'past' | 'calendar';

interface Interview {
  jobId: number;
  role: string;
  company: string;
  status: string;
  when: Date;
  mode: string;
  location: string | null;
}

/** Interviews — Figma nodes 7:4984 (upcoming), 7:5163 (past), 7:5282 (calendar). */
export default function InterviewsPage() {
  const { data, isLoading, isError, refetch } = useAppliedJobs();
  const [params, setParams] = useSearchParams();

  const raw = params.get('tab');
  const tab: TabKey = raw === 'past' || raw === 'calendar' ? raw : 'upcoming';
  const setTab = (key: TabKey) => {
    const next = new URLSearchParams(params);
    next.set('tab', key);
    setParams(next, { replace: true });
  };

  const { upcoming, past, all } = useMemo(() => split(Array.isArray(data) ? data : []), [data]);

  return (
    <>
      <ModuleHeader title="Interviews" />

      <Tabs
        items={[
          { key: 'upcoming', label: 'Upcoming', count: upcoming.length },
          { key: 'past', label: 'Past', count: past.length },
          { key: 'calendar', label: 'Calendar' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {isError ? (
        <Card>
          <ErrorState message="We could not load your interviews." onRetry={refetch} />
        </Card>
      ) : isLoading ? (
        <Card>
          <CardBody>
            <SkeletonRows rows={3} />
          </CardBody>
        </Card>
      ) : tab === 'calendar' ? (
        <CalendarView interviews={all} />
      ) : (tab === 'upcoming' ? upcoming : past).length ? (
        <div className="space-y-3">
          {(tab === 'upcoming' ? upcoming : past).map((i) =>
            tab === 'upcoming' ? (
              <UpcomingCard key={`${i.jobId}-${i.when.toISOString()}`} interview={i} />
            ) : (
              <PastRow key={`${i.jobId}-${i.when.toISOString()}`} interview={i} />
            ),
          )}
        </div>
      ) : (
        <Card>
          <EmptyState
            title={tab === 'upcoming' ? 'No interviews scheduled' : 'No past interviews'}
            description={
              tab === 'upcoming'
                ? 'When a recruiter schedules an interview it will appear here with the joining details.'
                : 'Interviews you have already attended will be listed here.'
            }
          />
        </Card>
      )}
    </>
  );
}

/** Applications carry at most one scheduled interview; split them by date. */
function split(jobs: AppliedJob[]) {
  const now = Date.now();
  const all: Interview[] = jobs
    .filter((j) => j.interview?.scheduledOn)
    .map((j) => ({
      jobId: j.jobId,
      role: j.designation,
      company: j.company,
      status: j.status,
      when: new Date(j.interview!.scheduledOn),
      mode: j.interview!.mode,
      location: j.interview!.location,
    }))
    .filter((i) => !Number.isNaN(i.when.getTime()));

  return {
    all,
    upcoming: all.filter((i) => i.when.getTime() >= now).sort((a, b) => a.when.getTime() - b.when.getTime()),
    past: all.filter((i) => i.when.getTime() < now).sort((a, b) => b.when.getTime() - a.when.getTime()),
  };
}

const timeOf = (d: Date) =>
  d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

/** Builds a Google Calendar draft — no calendar integration exists server-side. */
function calendarUrl(i: Interview) {
  const start = i.when;
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const stamp = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${i.role} interview · ${i.company}`,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: `Interview mode: ${i.mode}`,
    location: i.location ?? '',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function UpcomingCard({ interview }: { interview: Interview }) {
  const online = /online|video|meet|zoom|teams/i.test(interview.mode);

  return (
    <Card>
      <CardBody>
        <div className="flex items-start gap-3">
          <InitialAvatar text={interview.company || '?'} className={avatarTone(interview.company || 'i')} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-sm font-bold text-slate-800 dark:text-gray-100">{interview.role}</h3>
              <Pill tone={statusView(interview.status).tone}>{interview.status}</Pill>
            </div>
            <p className="text-[13px] text-slate-500">{interview.company}</p>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-slate-600 dark:text-gray-300">
              <span>{dotted(longDate(interview.when.toISOString()), timeOf(interview.when))}</span>
              {interview.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4 shrink-0 text-slate-400" aria-hidden />
                  {interview.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                {online ? (
                  <Video className="size-4 shrink-0 text-slate-400" aria-hidden />
                ) : (
                  <Phone className="size-4 shrink-0 text-slate-400" aria-hidden />
                )}
                {interview.mode}
              </span>
            </div>

            <a
              href={calendarUrl(interview)}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-aj-line px-3.5 py-2 text-[13px] font-semibold text-aj-blue transition-colors hover:border-aj-blue hover:bg-blue-50 dark:border-gray-700 dark:hover:bg-blue-950"
            >
              <CalendarPlus className="size-4" aria-hidden />
              Add to Calendar
            </a>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function PastRow({ interview }: { interview: Interview }) {
  const view = statusView(interview.status);
  return (
    <Card>
      <CardBody className="flex flex-wrap items-center gap-3">
        <InitialAvatar text={interview.company || '?'} size="sm" className={avatarTone(interview.company || 'i')} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-slate-800 dark:text-gray-100">{interview.role}</p>
          <p className="truncate text-xs text-slate-500">
            {dotted(interview.company, interview.mode, longDate(interview.when.toISOString()))}
          </p>
        </div>
        <Pill tone={view.tone}>{view.label}</Pill>
      </CardBody>
    </Card>
  );
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function CalendarView({ interviews }: { interviews: Interview[] }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const byDay = useMemo(() => {
    const map = new Map<number, Interview[]>();
    for (const i of interviews) {
      if (i.when.getFullYear() !== year || i.when.getMonth() !== month) continue;
      const day = i.when.getDate();
      map.set(day, [...(map.get(day) ?? []), i]);
    }
    return map;
  }, [interviews, year, month]);

  const shift = (delta: number) => setCursor(new Date(year, month + delta, 1));

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-aj-line-soft px-5 py-4 dark:border-gray-700">
        <h2 className="font-display text-sm font-bold text-slate-800 dark:text-gray-100">
          {MONTH_NAMES[month]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[13px] font-medium text-slate-500 hover:bg-aj-canvas hover:text-aj-blue dark:hover:bg-gray-700"
          >
            <ChevronLeft className="size-4" aria-hidden />
            Prev
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[13px] font-medium text-slate-500 hover:bg-aj-canvas hover:text-aj-blue dark:hover:bg-gray-700"
          >
            Next
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <CardBody>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">
          {DAY_NAMES.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const events = byDay.get(day) ?? [];
            const isToday =
              today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            return (
              <div
                key={day}
                className={cn(
                  'min-h-16 rounded-lg border p-1.5 text-left',
                  events.length
                    ? 'border-aj-blue bg-blue-50 dark:bg-blue-950'
                    : 'border-aj-line-soft dark:border-gray-700',
                  isToday && 'ring-2 ring-aj-ring',
                )}
              >
                <span
                  className={cn(
                    'text-[11px] font-semibold',
                    events.length ? 'text-aj-blue' : 'text-slate-500',
                  )}
                >
                  {day}
                </span>
                {events.map((e) => (
                  <p
                    key={`${e.jobId}-${e.when.toISOString()}`}
                    title={`${e.company} – ${e.role} · ${timeOf(e.when)}`}
                    className="mt-0.5 truncate text-[10px] font-medium text-slate-700 dark:text-gray-200"
                  >
                    {e.company} – {e.role}
                  </p>
                ))}
              </div>
            );
          })}
        </div>

        {!interviews.length && (
          <p className="mt-4 text-center text-xs text-slate-400">
            No interviews scheduled yet — they will appear on this calendar automatically.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
