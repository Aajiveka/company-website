import { useState } from 'react';
import { BadgeCheck, Briefcase, Calendar, Camera, IndianRupee, Mail, MapPin, Phone, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, Modal } from '@/components/ui';
import { cn } from '@/lib/cn';
import ProfilePhotoUpload from '../ProfilePhotoUpload';
import type { CandidateProfile } from '../../candidate.types';

/** Stroke-dashed ring around the avatar, showing profile completeness at a glance. */
function CompletionRing({ percent, children }: { percent: number; children: React.ReactNode }) {
  const { t } = useTranslation('dashboard');
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const tone = percent === 100 ? 'stroke-green-500' : percent >= 50 ? 'stroke-yellow-500' : 'stroke-red-500';
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 128 128" aria-hidden>
        <circle cx="64" cy="64" r={radius} className="fill-none stroke-gray-200 dark:stroke-gray-700" strokeWidth="4" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          className={cn('fill-none transition-all duration-700', tone)}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
        />
      </svg>
      <div className="absolute inset-2 overflow-hidden rounded-full">{children}</div>
      <span
        className={cn(
          'absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border px-2 py-0.5 text-xs font-semibold',
          'border-gray-200 bg-white text-navy dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100',
        )}
      >
        {t('profile.percentComplete', { percent })}
      </span>
    </div>
  );
}

/** One fact in the header's two-column detail grid. */
function Fact({
  icon: Icon,
  children,
  verified,
}: {
  icon: typeof Mail;
  children: React.ReactNode;
  verified?: boolean;
}) {
  const { t } = useTranslation('dashboard');
  return (
    <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      <Icon className="h-4 w-4 shrink-0 text-gray-400" />
      <span className="truncate">{children}</span>
      {verified && (
        <BadgeCheck className="h-4 w-4 shrink-0 text-green-500" aria-label={t('profile.verified')} />
      )}
    </span>
  );
}

export interface ProfileHeaderProps {
  profile: CandidateProfile;
  percent: number;
}

export function ProfileHeader({ profile, percent }: ProfileHeaderProps) {
  const { t, i18n } = useTranslation('dashboard');
  const [photoOpen, setPhotoOpen] = useState(false);

  const updatedOn = profile.profileUpdatedAt
    ? new Date(profile.profileUpdatedAt).toLocaleDateString(i18n.language, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const experience = profile.totalExperience
    ? t('profile.yearsExperience', { count: Number(profile.totalExperience) })
    : '';

  return (
    <Card>
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="flex justify-center sm:block">
          <CompletionRing percent={percent}>
            <button
              type="button"
              onClick={() => setPhotoOpen(true)}
              className="group relative h-full w-full bg-gray-100 dark:bg-gray-800"
              aria-label={t('profile.changePhoto')}
            >
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  <User className="h-10 w-10 text-gray-400" />
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                <Camera className="h-6 w-6 text-white" />
              </span>
            </button>
          </CompletionRing>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate font-heading text-2xl font-bold text-navy">{profile.fullName}</h1>
              {profile.currentDesignation && (
                <p className="font-medium text-navy dark:text-gray-200">{profile.currentDesignation}</p>
              )}
              {profile.currentCompany && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('profile.atCompany', { company: profile.currentCompany })}
                </p>
              )}
            </div>
            {updatedOn && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('profile.lastUpdated', { date: updatedOn })}
              </p>
            )}
          </div>

          <div className="mt-4 grid gap-x-8 gap-y-2 border-t border-gray-200 pt-4 sm:grid-cols-2 dark:border-gray-700">
            {profile.city && <Fact icon={MapPin}>{profile.city}</Fact>}
            <Fact icon={Phone}>{profile.mobile}</Fact>
            {experience && <Fact icon={Briefcase}>{experience}</Fact>}
            {profile.email && (
              <Fact icon={Mail} verified={profile.emailVerified}>
                {profile.email}
              </Fact>
            )}
            {profile.currentCtc != null && (
              <Fact icon={IndianRupee}>{profile.currentCtc.toLocaleString('en-IN')}</Fact>
            )}
            {profile.noticePeriod != null && (
              <Fact icon={Calendar}>{t('profile.noticeDays', { count: profile.noticePeriod })}</Fact>
            )}
          </div>
        </div>
      </div>

      <Modal open={photoOpen} onClose={() => setPhotoOpen(false)} title={t('profile.changePhoto')}>
        <ProfilePhotoUpload
          currentPhotoUrl={profile.photoUrl ?? undefined}
          onUploaded={() => setPhotoOpen(false)}
        />
      </Modal>
    </Card>
  );
}

export interface QuickLink {
  id: string;
  label: string;
  /** Shown as an "Add"/"Update" call to action when the section is still empty. */
  action?: string;
}

/**
 * The sticky rail. Sections are anchors on this same page, so it scrolls rather than
 * navigates, and the entry for the section currently in view is highlighted.
 */
export function QuickLinks({ links, activeId }: { links: QuickLink[]; activeId: string }) {
  const { t } = useTranslation('dashboard');
  return (
    <nav aria-label={t('profile.quickLinks')} className="lg:sticky lg:top-20">
      <Card className="p-2 sm:p-2">
        <h2 className="px-3 py-2 text-base font-semibold text-navy">{t('profile.quickLinks')}</h2>
        <ul>
          {links.map((link) => (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition',
                  'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                  link.id === activeId
                    ? 'bg-brand-soft font-medium text-primary dark:bg-primary/10'
                    : 'text-gray-600 dark:text-gray-300',
                )}
              >
                <span>{link.label}</span>
                {link.action && <span className="text-xs font-medium text-primary">{link.action}</span>}
              </a>
            </li>
          ))}
        </ul>
      </Card>
    </nav>
  );
}
