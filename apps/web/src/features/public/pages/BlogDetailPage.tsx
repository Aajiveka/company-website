import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, UserRound } from 'lucide-react';
import { Button } from '@/components/ui';
import { BLOG_POSTS, getPost } from '../blogs.data';

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPost(slug) : undefined;

  if (!post) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center pt-24 text-center">
        <div>
          <h1 className="font-heading text-2xl font-bold text-navy">Article not found</h1>
          <Link to="/blogs" className="mt-4 inline-block text-primary hover:underline">
            ← Back to blog
          </Link>
        </div>
      </section>
    );
  }

  const related = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <article className="pt-28 pb-16">
      <div className="container max-w-3xl">
        <Link to="/blogs" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to blog
        </Link>
        <h1 className="mt-4 font-heading text-3xl font-bold leading-tight text-navy">{post.title}</h1>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" /> {post.date}
          </span>
          <span className="flex items-center gap-1.5">
            <UserRound className="h-4 w-4" /> {post.author}
          </span>
        </div>
        <img src={post.image} alt={post.title} className="mt-6 w-full rounded-2xl" />
        <div className="mt-8 space-y-4 text-gray-700">
          {post.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {/* Related */}
        <div className="mt-12 border-t border-gray-100 pt-8">
          <h2 className="text-xl">Related Articles</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <Link key={r.slug} to={`/blogs/${r.slug}`} className="group">
                <img src={r.image} alt={r.title} className="h-28 w-full rounded-lg object-cover" loading="lazy" />
                <h3 className="mt-2 text-sm font-medium text-navy group-hover:text-primary">{r.title}</h3>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link to="/register">
            <Button>Start your job search</Button>
          </Link>
        </div>
      </div>
    </article>
  );
}
