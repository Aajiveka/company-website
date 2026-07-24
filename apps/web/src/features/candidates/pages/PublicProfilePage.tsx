import { useParams } from 'react-router-dom';
import { Award, Briefcase, GraduationCap, MapPin, Share2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, Button, Card, ProfileSkeleton, useToast } from '@/components/ui';
import { Seo, SITE_URL } from '@/components/Seo';
import { api } from '@/lib/axios';
import type { CandidateProfile } from '../candidate.types';

/** Fetch a candidate's public profile by ID. */
function usePublicProfile(id: string) {
  return useQuery({
    queryKey: ['candidate', 'public-profile', id],
    queryFn: () => api.get<CandidateProfile>(`/candidates/${id}/profile`).then((r) => r.data),
    enabled: !!id,
  });
}

/** Public, read-only candidate profile — shareable link. */
export default function PublicProfilePage() {
  const { t } = useTranslation('dashboard');
  const { id = '' } = useParams();
  const { data, isLoading, isError } = usePublicProfile(id);
  const { notify } = useToast();

  const shareUrl = `${SITE_URL}/candidates/${id}`;
  const onShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: data?.fullName, url: shareUrl });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      notify('Link copied!', 'success');
    }
  };

  return (
    <section className="py-12 md:py-16">
      {data && (
        <Seo
          title={`${data.fullName} — ${data.designation}`}
          description={`View ${data.fullName}'s professional profile on Aajiveka. ${data.designation} with ${data.totalExperience} experience.`}
          path={`/candidates/${id}`}
          ogImage={data.photoUrl || undefined}
        />
      )}
      <div className="container max-w-4xl">
        <Breadcrumbs items={[{ label: 'Candidates', to: '/jobs' }, { label: data?.fullName ?? 'Profile' }]} />

        {isLoading ? (
          <ProfileSkeleton />
        ) : isError || !data ? (
          <Card className="py-10 text-center">
            <p className="text-navy">This profile is not available.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <Card className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              <img
                src={data.photoUrl ?? '/files/no-image.png'}
                alt={data.fullName}
                className="h-28 w-28 rounded-full object-cover ring-4 ring-brand-soft"
              />
              <div className="flex-1 text-center sm:text-left">
                <h1 className="font-heading text-2xl font-bold text-navy">{data.fullName}</h1>
                <p className="text-primary">{data.designation}</p>
                <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-gray-600 dark:text-gray-300 sm:justify-start">
                  {data.city && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" /> {data.city}
                    </span>
                  )}
                  {data.totalExperience && (
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4" /> {data.totalExperience}
                    </span>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={onShare}>
                <Share2 className="mr-1.5 h-4 w-4" /> Share
              </Button>
            </Card>

            {/* Skills */}
            {data.skills.length > 0 && (
              <Card>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-navy">
                  <Award className="h-5 w-5 text-primary" /> {t('profile.skills')}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {data.skills.map((s) => (
                    <span key={s} className="rounded-full bg-brand-soft px-3 py-1 text-sm text-primary">{s}</span>
                  ))}
                </div>
              </Card>
            )}

            {/* Experience + Education */}
            <div className="grid gap-6 md:grid-cols-2">
              {data.experience.length > 0 && (
                <Card>
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-navy">
                    <Briefcase className="h-5 w-5 text-primary" /> {t('profile.experience')}
                  </h2>
                  <ul className="space-y-4">
                    {data.experience.map((e, i) => (
                      <li key={i} className="border-l-2 border-brand-soft pl-3">
                        <p className="font-medium text-navy">{e.designation}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{e.company}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{e.from} — {e.to}</p>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {data.education.length > 0 && (
                <Card>
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-navy">
                    <GraduationCap className="h-5 w-5 text-primary" /> {t('profile.education')}
                  </h2>
                  <ul className="space-y-4">
                    {data.education.map((e, i) => (
                      <li key={i} className="border-l-2 border-brand-soft pl-3">
                        <p className="font-medium text-navy">{e.degree}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{e.institute}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{e.year}</p>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
