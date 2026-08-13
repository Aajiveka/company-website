import { Link } from 'react-router-dom';
import { BadgeCheck, Briefcase, IndianRupee, MapPin, Pencil } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Btn } from './primitives';
import type { PortalProfile } from '../usePortalProfile';

/**
 * The blue profile banner that sits under the header on every portal screen
 * (Figma: 1194×238, linear gradient #1A56DB → #2563EB, 32px padding).
 *
 * Empty fields render as greyed placeholders rather than collapsing, which is
 * how the "New Profile" frames show an untouched account.
 */
export function ProfileHero({ profile, onDownloadResume, downloading }: {
  profile: PortalProfile;
  onDownloadResume: () => void;
  downloading: boolean;
}) {
  const { name, initials, title, city, experience, expectedCtc, photoUrl, isNew, verified, percent, nextStep } =
    profile;

  return (
    <div className="bg-linear-to-r from-aj-blue to-aj-blue-end">
      <div className="mx-auto max-w-[1194px] px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
          {/* Avatar + online dot. `self-start` stops the wrapper stretching to full width
              in the stacked mobile layout, which would strand the dot at the screen edge. */}
          <div className="relative shrink-0 self-start sm:self-auto">
            <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-aj-pop sm:size-24">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="size-full object-cover" />
              ) : initials ? (
                <span className="font-display text-3xl font-bold text-aj-blue sm:text-[40px]">{initials}</span>
              ) : (
                <div className="flex flex-col gap-1.5" aria-hidden>
                  <span className="block h-1.5 w-9 rounded-full bg-blue-100" />
                  <span className="block h-1.5 w-7 rounded-full bg-blue-100" />
                  <span className="block h-1.5 w-8 rounded-full bg-blue-100" />
                </div>
              )}
            </div>
            {isNew ? (
              <Link
                to="/candidate/onboarding"
                aria-label="Complete your profile"
                className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-white bg-slate-300 text-white transition-colors hover:bg-slate-400"
              >
                <Pencil className="size-3.5" aria-hidden />
              </Link>
            ) : (
              <span
                aria-hidden
                className="absolute -bottom-0.5 -right-0.5 size-5 rounded-full border-2 border-white bg-[#00D492]"
              />
            )}
          </div>

          {/* Identity */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className={cn(
                  'font-display text-2xl font-bold text-white sm:text-[26px]',
                  isNew && 'italic text-white/60',
                )}
              >
                {name}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">
                {verified && <BadgeCheck className="size-3.5 text-[#00D492]" aria-hidden />}
                {verified ? 'Verified Profile' : 'New Profile'}
              </span>
            </div>

            <p className={cn('mt-1 text-base font-semibold text-blue-100', !title && 'italic text-white/50')}>
              {title || 'Professional Title · Role'}
            </p>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-blue-100">
              <HeroMeta icon={MapPin} value={city} placeholder="Location" />
              <HeroMeta icon={Briefcase} value={experience} placeholder="Experience" />
              <HeroMeta icon={IndianRupee} value={expectedCtc} placeholder="CTC" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 flex-col gap-2 sm:w-[166px]">
            <Btn
              shape="pill"
              variant="onBlue"
              onClick={onDownloadResume}
              disabled={!profile.hasResume || downloading}
              title={profile.hasResume ? undefined : 'Upload a resume first'}
            >
              {downloading ? 'Preparing…' : 'Download Resume'}
            </Btn>
            <Link to="/candidate/onboarding" className="contents">
              <Btn shape="pill" variant="onBlueOutline" block>
                Edit Profile
              </Btn>
            </Link>
          </div>
        </div>

        {/* Completion meter */}
        <div className="mt-5 rounded-xl bg-white/10 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-white">Profile Completion</span>
                <span className="text-sm font-bold text-white">{percent}%</span>
              </div>
              <div
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/25"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Profile completion"
              >
                <div
                  className="h-full rounded-full bg-[#00D492] transition-[width] duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
            {nextStep && (
              <p className="shrink-0 text-sm text-blue-200">
                Add <span className="font-semibold text-white">{nextStep.label}</span> to reach {nextStep.target}%
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroMeta({
  icon: Icon,
  value,
  placeholder,
}: {
  icon: typeof MapPin;
  value: string | null;
  placeholder: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1', !value && 'italic text-white/50')}>
      <Icon className="size-4 shrink-0" aria-hidden />
      {value || placeholder}
    </span>
  );
}
