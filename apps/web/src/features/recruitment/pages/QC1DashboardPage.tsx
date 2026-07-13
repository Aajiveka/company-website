import { Briefcase, FileX2, GraduationCap, Users, type LucideIcon } from 'lucide-react';
import { Breadcrumbs, Card, Skeleton } from '@/components/ui';
import { useQC1Stats } from '../recruitment.api';
import type { QC1Stats } from '../recruitment.types';

const CARDS: { key: keyof QC1Stats; label: string; icon: LucideIcon; color: string }[] = [
  { key: 'total', label: 'Registrations', icon: Users, color: 'text-primary bg-primary/10' },
  { key: 'cvMissing', label: 'CV not uploaded', icon: FileX2, color: 'text-amber-600 bg-amber-50' },
  { key: 'educationMissing', label: 'Education missing', icon: GraduationCap, color: 'text-red-600 bg-red-50' },
  { key: 'employmentMissing', label: 'Employment missing', icon: Briefcase, color: 'text-purple-600 bg-purple-50' },
];

/**
 * QC1 dashboard (dashboard-QC1.aspx / spQC1GetDashboardData).
 *
 * The proc reports what each registration is still MISSING — CV, education, employment. It
 * is a completeness view, not an approval funnel. The cards used to be
 * Pending/Approved/Rejected/In-Interview, which the mocks invented; against the real API
 * every one of them rendered blank.
 */
export default function QC1DashboardPage() {
  const { data, isLoading } = useQC1Stats();

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: 'Recruitment' }, { label: 'QC Dashboard' }]} />
      <h1 className="mb-6 font-heading text-2xl font-bold text-navy">QC1 Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map(({ key, label, icon: Icon, color }) => (
          <Card key={key} className="flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              {isLoading || !data ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <p className="font-heading text-3xl font-bold text-navy">{data[key]}</p>
              )}
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
