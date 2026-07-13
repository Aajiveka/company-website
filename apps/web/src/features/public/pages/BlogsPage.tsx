import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { PageBanner } from '../components/PageBanner';
import { BLOG_POSTS } from '../blogs.data';

export default function BlogsPage() {
  const [query, setQuery] = useState('');
  const posts = BLOG_POSTS.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <PageBanner variant="blog" title="Our Blogs">
        <div className="mx-auto mt-6 flex max-w-lg gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search articles…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button>Search</Button>
        </div>
      </PageBanner>

      <section className="py-12 md:py-20">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <article key={post.slug} className="overflow-hidden rounded-2xl bg-white shadow-card">
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
                    Read More <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {posts.length === 0 && <p className="py-10 text-center text-gray-500">No articles found.</p>}
        </div>
      </section>
    </>
  );
}
