import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <section className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="font-heading text-7xl font-bold text-primary">{t('notFound.title')}</p>
      <h1 className="mt-2 font-heading text-2xl font-semibold text-navy">{t('notFound.heading')}</h1>
      <p className="mt-2 text-gray-500">{t('notFound.message')}</p>
      <Link to="/" className="mt-6">
        <Button>{t('notFound.backHome')}</Button>
      </Link>
    </section>
  );
}
