import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { api } from '@/lib/axios';
import { useAuth } from '@/features/auth/auth.store';
import { useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useCvEditProfile, useCvMasters, useCandidateProfile, useDashboard } from '../../candidate.api';
import { Card, CardBody, CardHeader, SkeletonRows, StatTile } from '../components/primitives';
import { STEP_KEYS, WIZARD_STEPS, isStepKey, stepIndex, type WizardStepKey } from '../wizardSteps';
import { PersonalStep } from '../wizard/PersonalStep';
import { SummaryStep } from '../wizard/SummaryStep';
import { ExperienceStep } from '../wizard/ExperienceStep';
import { EducationStep } from '../wizard/EducationStep';
import { SkillsStep } from '../wizard/SkillsStep';
import { PreferencesStep } from '../wizard/PreferencesStep';
import { ProjectsStep } from '../wizard/ProjectsStep';
import { ResumeStep } from '../wizard/ResumeStep';

/**
 * The eight-step profile wizard (Figma 7:3777 and siblings).
 *
 * Doubles as the app's editing surface: the profile page's "Edit" links land on a
 * specific step via `?step=`, and every step saves on its own, so a candidate can
 * fix one section and leave without walking the rest.
 *
 * Finishing the last step also posts `complete-onboarding`, which is what clears the
 * `ProtectedRoute` redirect that pins new candidates to this page.
 */
export default function ProfileWizardPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { notify } = useToast();

  const { data: cv, isLoading } = useCvEditProfile();
  const { data: masters } = useCvMasters();
  const { data: profile } = useCandidateProfile();

  const requested = params.get('step');
  const current: WizardStepKey = isStepKey(requested) ? requested : 'personal';
  const index = stepIndex(current);

  const goTo = useCallback(
    (key: WizardStepKey) => {
      const next = new URLSearchParams(params);
      next.set('step', key);
      setParams(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [params, setParams],
  );

  const completeOnboarding = useMutation({
    mutationFn: () => api.post('/candidates/me/complete-onboarding').then((r) => r.data),
    onSuccess: () => {
      updateUser({ isOnboarded: true });
      notify('Your profile is complete.', 'success');
      navigate('/candidate/profile');
    },
    // Never strand the candidate in the wizard because one bookkeeping call failed.
    onError: () => navigate('/candidate/profile'),
  });

  const onBack = () => {
    if (index > 0) goTo(STEP_KEYS[index - 1]);
  };

  const onNext = () => {
    if (index < STEP_KEYS.length - 1) {
      goTo(STEP_KEYS[index + 1]);
      return;
    }
    // Last step. Already-onboarded candidates are just editing — send them back.
    if (user?.isOnboarded) {
      notify('Profile updated.', 'success');
      navigate('/candidate/profile');
    } else {
      completeOnboarding.mutate();
    }
  };

  if (isLoading || !cv) {
    return (
      <Card>
        <CardBody>
          <SkeletonRows rows={4} />
        </CardBody>
      </Card>
    );
  }

  const shared = {
    onBack,
    onNext,
    isFirst: index === 0,
    isLast: index === STEP_KEYS.length - 1,
    stepIndex: index,
    totalSteps: STEP_KEYS.length,
  };

  return (
    <>
      {!user?.isOnboarded && (
        <div className="flex items-start gap-4 rounded-xl bg-linear-to-r from-aj-blue to-aj-blue-end px-5 py-4 text-white">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
            <Sparkles className="size-5 text-amber-300" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold">Welcome to Aajiveka!</h2>
            <p className="text-sm text-blue-100">
              Complete your profile in {STEP_KEYS.length} simple steps to get matched with top companies and enable
              recruiter visibility.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardBody className="flex flex-wrap gap-2">
          {WIZARD_STEPS.map((step, i) => (
            <button
              key={step.key}
              type="button"
              onClick={() => goTo(step.key)}
              aria-current={step.key === current ? 'step' : undefined}
              className={cn(
                'rounded-full px-4 py-2 text-[13px] font-semibold transition-colors',
                step.key === current
                  ? 'bg-aj-blue text-white shadow-aj-raised'
                  : i < index
                    ? 'bg-blue-50 text-aj-blue dark:bg-blue-950'
                    : 'bg-aj-canvas text-slate-600 hover:bg-blue-50 hover:text-aj-blue dark:bg-gray-700 dark:text-gray-300',
              )}
            >
              {step.title}
            </button>
          ))}
        </CardBody>
      </Card>

      {current === 'personal' && <PersonalStep {...shared} cv={cv} masters={masters} />}
      {current === 'summary' && <SummaryStep {...shared} cv={cv} />}
      {current === 'experience' && <ExperienceStep {...shared} cv={cv} masters={masters} />}
      {current === 'education' && <EducationStep {...shared} cv={cv} masters={masters} />}
      {current === 'skills' && <SkillsStep {...shared} cv={cv} />}
      {current === 'preferences' && <PreferencesStep {...shared} cv={cv} masters={masters} />}
      {current === 'projects' && <ProjectsStep {...shared} cv={cv} />}
      {current === 'resume' && <ResumeStep {...shared} profile={profile} />}

      <ActivityCard locked={!user?.isOnboarded} />
    </>
  );
}

/** The muted activity strip the wizard frames show under the step card. */
function ActivityCard({ locked }: { locked: boolean }) {
  const { data } = useDashboard();

  return (
    <Card>
      <CardHeader title="Profile Activity" />
      <CardBody>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile value="—" label="Profile Views" tone="blue" />
          <StatTile value={locked ? '—' : (data?.appliedCount ?? 0)} label="Applications" tone="green" />
          <StatTile value={locked ? '—' : (data?.interviewCount ?? 0)} label="Interview Calls" tone="amber" />
        </div>
        {locked && <p className="mt-3 text-right text-xs text-slate-400">Activity unlocks after profile is complete</p>}
      </CardBody>
    </Card>
  );
}
