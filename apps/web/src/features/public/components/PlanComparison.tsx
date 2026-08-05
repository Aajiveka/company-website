import { Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Free vs Premium benefit matrix — verbatim from the company brochure. */
const ROWS: { key: string; free: boolean; note?: string }[] = [
  { key: 'feature1', free: true },
  { key: 'feature2', free: false },
  { key: 'feature3', free: false },
  { key: 'feature4', free: false },
  { key: 'feature5', free: false },
  { key: 'feature6', free: false },
  { key: 'feature7', free: false },
  { key: 'feature8', free: false },
  { key: 'feature9', free: false },
  { key: 'feature10', free: false },
  { key: 'feature11', free: false },
  { key: 'feature12', free: false, note: 'feature12Note' },
  { key: 'feature13', free: false },
];

export function PlanComparison() {
  const { t } = useTranslation('public');

  return (
    <section className="py-12">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <h2>{t('comparison.heading')}</h2>
          <p className="mt-4 text-gray-600 dark:text-gray-300">{t('comparison.subtext')}</p>
        </div>

        <div className="mt-8 overflow-x-auto rounded-2xl bg-white shadow-card dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700">
          <table className="w-full min-w-xl border-collapse text-left">
            <thead>
              <tr className="bg-navy text-white">
                <th scope="col" className="px-4 py-3 font-heading text-sm font-semibold sm:px-6 sm:text-base">
                  {t('comparison.benefitColumn')}
                </th>
                <th scope="col" className="px-4 py-3 text-center font-heading text-sm font-semibold sm:px-6 sm:text-base">
                  {t('comparison.free')}
                </th>
                <th scope="col" className="px-4 py-3 text-center font-heading text-sm font-semibold sm:px-6 sm:text-base">
                  {t('comparison.premium')}
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.key} className="border-t border-gray-100 dark:border-gray-700">
                  <th scope="row" className="px-4 py-3 text-sm font-medium text-primary sm:px-6">
                    {t(`comparison.${row.key}`)}
                  </th>
                  <td className="px-4 py-3 text-center sm:px-6">
                    <Availability available={row.free} t={t} />
                  </td>
                  <td className="px-4 py-3 text-center sm:px-6">
                    <span className="inline-flex items-center justify-center gap-2">
                      <Availability available t={t} />
                      {row.note && (
                        <span className="text-xs text-gray-600 dark:text-gray-400">({t(`comparison.${row.note}`)})</span>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Availability({ available, t }: { available: boolean; t: (key: string) => string }) {
  const label = t(available ? 'comparison.included' : 'comparison.notIncluded');
  return available ? (
    <Check aria-label={label} role="img" className="inline-block h-5 w-5 text-green-600 dark:text-green-400" />
  ) : (
    <X aria-label={label} role="img" className="inline-block h-5 w-5 text-danger" />
  );
}
