import { useCallback, useState } from 'react';
import { Eye, FileText, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  CardSkeleton,
  ConfirmDialog,
  Input,
  Select,
  useToast,
} from '@/components/ui';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { api } from '@/lib/axios';
import RichTextEditor from '@/components/RichTextEditor';

interface BlogPost {
  postId: number;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  imageUrl: string;
  category: string;
  status: 'Draft' | 'Published';
  author: string;
  createdAt: string;
  publishedAt: string | null;
}

const CATEGORIES = [
  { label: 'General', value: 'general' },
  { label: 'Career Tips', value: 'career-tips' },
  { label: 'Industry News', value: 'industry-news' },
  { label: 'Company Updates', value: 'company-updates' },
  { label: 'Interview Prep', value: 'interview-prep' },
  { label: 'Skill Development', value: 'skill-development' },
];

function autoSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function PostEditor({
  post,
  onSave,
  onCancel,
  isSaving,
}: {
  post?: BlogPost;
  onSave: (data: Partial<BlogPost>) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const { t } = useTranslation('dashboard');
  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [body, setBody] = useState(post?.body ?? '');
  const [imageUrl, setImageUrl] = useState(post?.imageUrl ?? '');
  const [category, setCategory] = useState(post?.category ?? 'general');

  const isDirty =
    title !== (post?.title ?? '') ||
    slug !== (post?.slug ?? '') ||
    excerpt !== (post?.excerpt ?? '') ||
    body !== (post?.body ?? '') ||
    imageUrl !== (post?.imageUrl ?? '') ||
    category !== (post?.category ?? 'general');
  useUnsavedChanges(isDirty);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(e.target.value);
      if (!post) setSlug(autoSlug(e.target.value));
    },
    [post],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t('blogCms.title')}
          value={title}
          onChange={handleTitleChange}
          required
        />
        <Input
          label={t('blogCms.slug')}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label={t('blogCms.category')}
          options={CATEGORIES}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <Input
          label={t('blogCms.imageUrl')}
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      {/* Featured image preview */}
      {imageUrl && (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <img
            src={imageUrl}
            alt={t('blogCms.featuredImagePreview')}
            className="h-48 w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-navy dark:text-gray-200">
          {t('blogCms.excerpt')}
        </label>
        <textarea
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-navy dark:text-gray-200">
          {t('blogCms.body')}
        </label>
        <RichTextEditor
          value={body}
          onChange={setBody}
          placeholder={t('blogCms.bodyPlaceholder')}
          minHeight="250px"
        />
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
        <Button variant="outline" size="sm" onClick={onCancel}>
          {t('common:actions.cancel')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onSave({ title, slug, excerpt, body, imageUrl, category, status: 'Draft' })}
          isLoading={isSaving}
        >
          {t('blogCms.saveAsDraft')}
        </Button>
        <Button
          size="sm"
          variant="accent"
          onClick={() => onSave({ title, slug, excerpt, body, imageUrl, category, status: 'Published' })}
          isLoading={isSaving}
        >
          {t('blogCms.publish')}
        </Button>
      </div>
    </div>
  );
}

export default function BlogCmsPage() {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<BlogPost | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data: posts, isLoading } = useQuery({
    queryKey: ['admin', 'blog-posts'],
    queryFn: () => api.get<BlogPost[]>('/admin/blog-posts').then((r) => r.data),
  });

  const filteredPosts = (posts ?? []).filter((post) => {
    if (search && !post.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && post.status !== statusFilter) return false;
    if (categoryFilter && post.category !== categoryFilter) return false;
    return true;
  });

  const saveMutation = useMutation({
    mutationFn: (payload: { postId?: number; data: Partial<BlogPost> }) =>
      payload.postId
        ? api.patch(`/admin/blog-posts/${payload.postId}`, payload.data).then((r) => r.data)
        : api.post('/admin/blog-posts', payload.data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'blog-posts'] });
      notify(t('blogCms.saved'), 'success');
      setEditing(null);
    },
    onError: () => notify(t('blogCms.saveFailed'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (postId: number) => api.delete(`/admin/blog-posts/${postId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'blog-posts'] });
      notify(t('blogCms.deleted'), 'success');
      setDeleteTarget(null);
    },
    onError: () => notify(t('blogCms.deleteFailed'), 'error'),
  });

  const togglePublish = useMutation({
    mutationFn: (post: BlogPost) =>
      api
        .patch(`/admin/blog-posts/${post.postId}`, {
          status: post.status === 'Published' ? 'Draft' : 'Published',
        })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'blog-posts'] });
      notify(t('blogCms.saved'), 'success');
    },
    onError: () => notify(t('blogCms.saveFailed'), 'error'),
  });

  const statusOptions = [
    { label: t('blogCms.allStatuses'), value: '' },
    { label: 'Draft', value: 'Draft' },
    { label: 'Published', value: 'Published' },
  ];

  const categoryOptions = [
    { label: t('blogCms.allCategories'), value: '' },
    ...CATEGORIES,
  ];

  const draftCount = (posts ?? []).filter((p) => p.status === 'Draft').length;
  const publishedCount = (posts ?? []).filter((p) => p.status === 'Published').length;

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/admin' }, { label: t('blogCms.heading') }]} />

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-navy">
            <FileText className="h-6 w-6" />
            {t('blogCms.heading')}
          </h1>
          {posts && (
            <div className="mt-1 flex gap-2">
              <Badge tone="gray">{posts.length} {t('blogCms.total')}</Badge>
              <Badge tone="green">{publishedCount} {t('blogCms.published')}</Badge>
              <Badge tone="amber">{draftCount} {t('blogCms.drafts')}</Badge>
            </div>
          )}
        </div>
        {!editing && (
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus className="mr-1 h-4 w-4" /> {t('blogCms.newPost')}
          </Button>
        )}
      </div>

      {editing ? (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-navy">
            {editing === 'new' ? t('blogCms.createPost') : t('blogCms.editPost')}
          </h2>
          <PostEditor
            post={editing === 'new' ? undefined : editing}
            onCancel={() => setEditing(null)}
            isSaving={saveMutation.isPending}
            onSave={(data) =>
              saveMutation.mutate({
                postId: editing !== 'new' ? editing.postId : undefined,
                data,
              })
            }
          />
        </Card>
      ) : (
        <>
          {/* Search & filter bar */}
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-end">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                className="pl-9"
                placeholder={t('blogCms.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-40">
              <Select
                options={statusOptions}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={categoryOptions}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : filteredPosts.length === 0 ? (
            <Card className="text-center">
              <FileText className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-navy">{t('blogCms.noPosts')}</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredPosts.map((post) => (
                <Card key={post.postId} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {post.imageUrl && (
                      <img
                        src={post.imageUrl}
                        alt=""
                        className="hidden h-16 w-24 shrink-0 rounded-lg object-cover sm:block"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-medium text-navy">{post.title}</h3>
                        <Badge tone={post.status === 'Published' ? 'green' : 'amber'}>{post.status}</Badge>
                        {post.category && (
                          <Badge tone="blue">{post.category}</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        /{post.slug} &middot; {post.author} &middot; {new Date(post.createdAt).toLocaleDateString()}
                        {post.publishedAt && (
                          <> &middot; Published {new Date(post.publishedAt).toLocaleDateString()}</>
                        )}
                      </p>
                      {post.excerpt && (
                        <p className="mt-1 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">{post.excerpt}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => togglePublish.mutate(post)}
                      disabled={togglePublish.isPending}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${
                        post.status === 'Published'
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400'
                          : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400'
                      }`}
                    >
                      {post.status === 'Published' ? t('blogCms.unpublish') : t('blogCms.publish')}
                    </button>
                    <a
                      href={`/blogs/${post.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300"
                    >
                      <Eye className="h-3.5 w-3.5" /> {t('blogCms.preview')}
                    </a>
                    <button
                      onClick={() => setEditing(post)}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"
                    >
                      <Pencil className="h-3.5 w-3.5" /> {t('common:actions.edit')}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(post)}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {t('common:actions.delete')}
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={t('blogCms.deleteTitle')}
        message={t('blogCms.deleteWarning', { title: deleteTarget?.title })}
        confirmLabel={t('common:actions.delete')}
        variant="danger"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.postId)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
