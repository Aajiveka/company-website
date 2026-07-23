import { Award, Briefcase, GraduationCap, Mail, MapPin, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, Card, CardSkeleton } from '@/components/ui';
import { useCandidateProfile } from '../candidate.api';

/** Candidate self-profile / CV view (candidate-profile.aspx). */
export default function CandidateProfilePage() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading, isError } = useCandidateProfile();

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/candidate/profile' }, { label: t('profile.heading') }]} />

      {isLoading ? (
        <CardSkeleton />
      ) : isError || !data ? (
        <Card>{t('profile.loadError')}</Card>
      ) : (
        <div className="space-y-6">
          {/* Header card */}
          <Card className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <img
              src={data.photoUrl ?? '/files/no-image.png'}
              alt={data.fullName}
              className="h-28 w-28 rounded-full object-cover ring-4 ring-brand-soft"
            />
            <div className="text-center sm:text-left">
              <h1 className="font-heading text-2xl font-bold text-navy">{data.fullName}</h1>
              <p className="text-primary">{data.designation}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-gray-600 sm:justify-start">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4" /> {data.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4" /> {data.mobile}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> {data.city}
                </span>
                <span className="flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4" /> {data.totalExperience}
                </span>
              </div>
            </div>
          </Card>

          {/* Skills */}
          <Card>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-navy">
              <Award className="h-5 w-5 text-primary" /> {t('profile.skills')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.skills.map((s) => (
                <span key={s} className="rounded-full bg-brand-soft px-3 py-1 text-sm text-primary">
                  {s}
                </span>
              ))}
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Experience */}
            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-navy">
                <Briefcase className="h-5 w-5 text-primary" /> {t('profile.experience')}
              </h2>
              <ul className="space-y-4">
                {data.experience.map((e, i) => (
                  <li key={i} className="border-l-2 border-brand-soft pl-3">
                    <p className="font-medium text-navy">{e.designation}</p>
                    <p className="text-sm text-gray-600">{e.company}</p>
                    <p className="text-xs text-gray-400">
                      {e.from} — {e.to}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Education */}
            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-navy">
                <GraduationCap className="h-5 w-5 text-primary" /> {t('profile.education')}
              </h2>
              <ul className="space-y-4">
                {data.education.map((e, i) => (
                  <li key={i} className="border-l-2 border-brand-soft pl-3">
                    <p className="font-medium text-navy">{e.degree}</p>
                    <p className="text-sm text-gray-600">{e.institute}</p>
                    <p className="text-xs text-gray-400">{e.year}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
