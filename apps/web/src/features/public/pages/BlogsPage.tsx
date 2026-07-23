import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { PageBanner } from '../components/PageBanner';
import { BLOG_POSTS } from '../blogs.data';

export default function BlogsPage() {
  const { t } = useTranslation('public');
  const [query, setQuery] = useState('');
  const posts = BLOG_POSTS.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <Seo
        title="Blog"
        description="Read career tips, industry insights, and job market trends on the Aajiveka blog. Stay informed and advance your career."
        path="/blogs"
      />
      <PageBanner variant="blog" title={t('blogs.heading')}>
        <div className="mx-auto mt-6 flex max-w-full gap-2 sm:max-w-lg">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-9"
              placeholder={t('blogs.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button>{t('actions.search', { ns: 'common' })}</Button>
        </div>
      </PageBanner>

      <section className="py-12 md:py-20">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <article key={post.slug} className="overflow-hidden rounded-2xl bg-white dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700 shadow-card">
                <Link to={`/blogs/${post.slug}`}>
                  <img src={post.image} alt={post.title} className="h-52 w-full object-cover" loading="lazy" />
                </Link>
                <div className="p-6">
                  <p className="text-xs text-gray-400">{post.date}</p>
                  <Link to={`/blogs/${post.slug}`}>
                    <h3 className="mt-2 font-heading text-lg font-semibold text-navy hover:text-primary">
                      {post.title}
                    </h3>
                  </Link>
                  <p className="mt-2 line-clamp-3 text-sm text-gray-600">{post.excerpt}</p>
                  <Link
                    to={`/blogs/${post.slug}`}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:gap-2"
                  >
                    {t('actions.readMore', { ns: 'common' })} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {posts.length === 0 && <p className="py-10 text-center text-gray-500">{t('blogs.noArticles')}</p>}
        </div>
      </section>
    </>
  );
}
