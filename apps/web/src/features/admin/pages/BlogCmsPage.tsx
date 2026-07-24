import { useState } from 'react';
import { Eye, FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, Badge, Button, Card, CardSkeleton, Input, Modal, useToast } from '@/components/ui';
import { api } from '@/lib/axios';

interface BlogPost {
  postId: number;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  imageUrl: string;
  status: 'Draft' | 'Published';
  author: string;
  createdAt: string;
  publishedAt: string | null;
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

  const autoSlug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  return (
    <div className="space-y-4">
      <Input
        label={t('blogCms.title')}
        value={title}
        onChange={(e) => { setTitle(e.target.value); if (!post) setSlug(autoSlug(e.target.value)); }}
      />
      <Input label={t('blogCms.slug')} value={slug} onChange={(e) => setSlug(e.target.value)} />
      <Input label={t('blogCms.imageUrl')} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-navy">{t('blogCms.excerpt')}</label>
        <textarea
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-navy">{t('blogCms.body')}</label>
        <textarea
          rows={12}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('blogCms.bodyPlaceholder')}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>{t('common:actions.cancel')}</Button>
        <Button
          size="sm"
          onClick={() => onSave({ title, slug, excerpt, body, imageUrl, status: 'Draft' })}
          isLoading={isSaving}
        >
          {t('common:actions.save')}
        </Button>
        <Button
          size="sm"
          variant="accent"
          onClick={() => onSave({ title, slug, excerpt, body, imageUrl, status: 'Published' })}
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

  const { data: posts, isLoading } = useQuery({
    queryKey: ['admin', 'blog-posts'],
    queryFn: () => api.get<BlogPost[]>('/admin/blog-posts').then((r) => r.data),
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

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/admin' }, { label: t('blogCms.heading') }]} />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-2xl font-bold text-navy">{t('blogCms.heading')}</h1>
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
      ) : isLoading ? (
        <div className="space-y-4"><CardSkeleton /><CardSkeleton /></div>
      ) : !posts?.length ? (
        <Card className="text-center">
          <FileText className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-navy">{t('blogCms.noPosts')}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Card key={post.postId} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-medium text-navy">{post.title}</h3>
                  <Badge tone={post.status === 'Published' ? 'green' : 'gray'}>{post.status}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  /{post.slug} · {post.author} · {new Date(post.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/blogs/${post.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-gray-50 dark:bg-gray-700 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100"
                >
                  <Eye className="h-3.5 w-3.5" /> {t('blogCms.preview')}
                </a>
                <button
                  onClick={() => setEditing(post)}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-100"
                >
                  <Pencil className="h-3.5 w-3.5" /> {t('common:actions.edit')}
                </button>
                <button
                  onClick={() => setDeleteTarget(post)}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-50 dark:bg-red-900/20 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5" /> {t('common:actions.delete')}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('blogCms.deleteTitle')}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t('blogCms.deleteWarning', { title: deleteTarget?.title })}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>{t('common:actions.cancel')}</Button>
            <Button variant="danger" size="sm" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.postId)} isLoading={deleteMutation.isPending}>
              {t('common:actions.delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
