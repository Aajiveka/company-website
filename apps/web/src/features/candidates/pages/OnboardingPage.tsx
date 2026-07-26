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
      api.patch('/candidates/me/profile', { isOnboarded: true }).then((r) => r.data),
    onSuccess: () => {
      updateUser({ isOnboarded: true });
      navigate('/candidate/dashboard', { replace: true });
    },
  });

  return (
    <OnboardingWizard
      initialName={user?.fullName}
      initialEmail={user?.email}
      onComplete={() => completeOnboarding.mutate()}
    />
  );
}
