import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/auth.store';
import { api } from '@/lib/axios';
import { OnboardingWizard } from '../components/OnboardingWizard';

/** Post-registration onboarding — guides new candidates through profile setup. */
export default function OnboardingPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const completeOnboarding = useMutation({
    mutationFn: () =>
      // PATCH /candidates/me/profile never existed — it 404'd, so onSuccess never ran and the
      // candidate stayed flagged as not-onboarded, i.e. permanently redirected back here.
      api.post('/candidates/me/complete-onboarding').then((r) => r.data),
    onSuccess: () => {
      updateUser({ isOnboarded: true });
      navigate('/candidate/dashboard', { replace: true });
    },
    // Never strand the candidate in the wizard because one bookkeeping call failed.
    onError: () => navigate('/candidate/dashboard', { replace: true }),
  });

  return (
    <OnboardingWizard
      initialName={user?.fullName}
      initialEmail={user?.email}
      // For a candidate, UserName IS the mobile (tblSecUser.UserName; see AuthService), and
      // this route is guarded to Role.Subscriber, so it cannot be some other identifier here.
      // Without it the wizard asked new candidates to retype the number they just registered
      // with — and its `mobile` field is required, so the step could not be submitted blank.
      initialMobile={user?.userName}
      onComplete={() => completeOnboarding.mutate()}
    />
  );
}
