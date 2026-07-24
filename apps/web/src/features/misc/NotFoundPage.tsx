import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { Seo } from '@/components/Seo';

export default function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="flex min-h-screen flex-col items-center justify-center bg-brand-soft/30 px-4 text-center dark:bg-gray-900">
      <Seo title="Page Not Found" noIndex />

      {/* Illustration */}
      <div className="relative mb-6">
        <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
          <SearchX className="h-16 w-16 text-primary" />
        </div>
        <span className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-bold text-primary shadow-md dark:bg-gray-800">
          ?
        </span>
      </div>

      <p className="font-heading text-8xl font-extrabold tracking-tight text-primary/20 dark:text-primary/30">
        {t('notFound.title')}
      </p>
      <h1 className="mt-1 font-heading text-2xl font-bold text-navy sm:text-3xl">
        {t('notFound.heading')}
      </h1>
      <p className="mt-3 max-w-md text-gray-500 dark:text-gray-400">
        {t('notFound.message')}
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {t('notFound.goBack')}
        </Button>
        <Link to="/">
          <Button>
            <Home className="mr-1.5 h-4 w-4" />
            {t('notFound.backHome')}
          </Button>
        </Link>
      </div>

      <Link
        to="/jobs"
        className="mt-6 text-sm font-medium text-primary hover:underline"
      >
        {t('notFound.browseJobs')}
      </Link>
    </section>
  );
}
