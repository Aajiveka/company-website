import { Link } from 'react-router-dom';
import { EmptyState, PageHeader, PrimaryButton } from '@/employer/components/Cards/ui';
import { employerPaths } from '@/employer/constants/paths';

export function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Team, security, and integrations are not available in this release."
        actions={
          <Link to={employerPaths.completeProfile}>
            <PrimaryButton>Edit company profile</PrimaryButton>
          </Link>
        }
      />
      <EmptyState
        title="Settings coming soon"
        description="Use Company Profile for company details. Recruiters, roles, API keys, and integrations will land in a later release."
        action={
          <Link to={employerPaths.completeProfile}>
            <PrimaryButton>Open company profile</PrimaryButton>
          </Link>
        }
      />
    </div>
  );
}
