import { useAuth } from '@/features/auth/auth.store';
import { OnboardingWizard } from '../components/OnboardingWizard';

/** Post-registration onboarding — guides new candidates through profile setup. */
export default function OnboardingPage() {
  const { user } = useAuth();
  return (
    <OnboardingWizard
      initialName={user?.fullName}
      initialEmail={user?.email}
    />
  );
}
