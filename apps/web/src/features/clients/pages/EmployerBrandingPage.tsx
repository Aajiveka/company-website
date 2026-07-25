import { useState } from 'react';
import {
  Save,
  Eye,
  Plus,
  X,
  Image,
  Video,
  Heart,
  Gift,
  BookOpen,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  Star,
  Shield,
  Users,
  Lightbulb,
  Target,
  Zap,
  Globe,
  Award,
  Handshake,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Breadcrumbs,
  Button,
  Card,
  CardSkeleton,
  Input,
  Modal,
  useToast,
} from '@/components/ui';
import { api } from '@/lib/axios';
import { cn } from '@/lib/cn';

const ICON_OPTIONS = [
  { name: 'Star', icon: Star },
  { name: 'Heart', icon: Heart },
  { name: 'Shield', icon: Shield },
  { name: 'Users', icon: Users },
  { name: 'Lightbulb', icon: Lightbulb },
  { name: 'Target', icon: Target },
  { name: 'Zap', icon: Zap },
  { name: 'Globe', icon: Globe },
  { name: 'Award', icon: Award },
  { name: 'Handshake', icon: Handshake },
] as const;

type IconName = (typeof ICON_OPTIONS)[number]['name'];

interface CultureValue {
  icon: IconName;
  title: string;
  description: string;
}

interface SocialLinks {
  linkedin: string;
  twitter: string;
  instagram: string;
  facebook: string;
}

interface BrandingData {
  companyStory: string;
  cultureValues: CultureValue[];
  perks: string[];
  teamPhotos: string[];
  companyVideo: string;
  socialLinks: SocialLinks;
}

const EMPTY_BRANDING: BrandingData = {
  companyStory: '',
  cultureValues: [],
  perks: [],
  teamPhotos: [],
  companyVideo: '',
  socialLinks: { linkedin: '', twitter: '', instagram: '', facebook: '' },
};

function IconPicker({
  selected,
  onSelect,
}: {
  selected: IconName;
  onSelect: (name: IconName) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ICON_OPTIONS.map(({ name, icon: Icon }) => (
        <button
          key={name}
          type="button"
          onClick={() => onSelect(name)}
          className={cn(
            'rounded-lg border p-2 transition',
            selected === name
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 dark:border-gray-600 dark:hover:border-gray-500',
          )}
          aria-label={name}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

function getIconComponent(name: IconName) {
  const match = ICON_OPTIONS.find((o) => o.name === name);
  return match?.icon ?? Star;
}

function CompanyStorySection({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation('dashboard');
  return (
    <Card>
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-navy">
        <BookOpen className="h-5 w-5 text-primary" />
        {t('branding.companyStory')}
      </h3>
      <textarea
        rows={5}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        placeholder={t('branding.companyStoryPlaceholder')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Card>
  );
}

function CultureValuesSection({
  values,
  onChange,
}: {
  values: CultureValue[];
  onChange: (v: CultureValue[]) => void;
}) {
  const { t } = useTranslation('dashboard');

  const addValue = () => {
    onChange([...values, { icon: 'Star', title: '', description: '' }]);
  };

  const updateValue = (index: number, patch: Partial<CultureValue>) => {
    onChange(values.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  };

  const removeValue = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-navy">
        <Heart className="h-5 w-5 text-primary" />
        {t('branding.cultureValues')}
      </h3>

      <div className="space-y-4">
        {values.map((val, index) => (
          <div
            key={index}
            className="rounded-lg border border-gray-200 p-3 dark:border-gray-600"
          >
            <div className="mb-3 flex items-start justify-between">
              <IconPicker
                selected={val.icon}
                onSelect={(icon) => updateValue(index, { icon })}
              />
              <button
                type="button"
                onClick={() => removeValue(index)}
                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                aria-label={t('branding.removeValue')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              <Input
                label={t('branding.valueTitle')}
                value={val.title}
                onChange={(e) => updateValue(index, { title: e.target.value })}
                placeholder={t('branding.valueTitlePlaceholder')}
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy dark:text-gray-200">
                  {t('branding.valueDescription')}
                </label>
                <textarea
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder={t('branding.valueDescriptionPlaceholder')}
                  value={val.description}
                  onChange={(e) => updateValue(index, { description: e.target.value })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addValue}
        className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:border-primary hover:text-primary dark:border-gray-600 dark:hover:border-primary"
      >
        <Plus className="h-4 w-4" />
        {t('branding.addValue')}
      </button>
    </Card>
  );
}

function PerksSection({
  perks,
  onChange,
}: {
  perks: string[];
  onChange: (v: string[]) => void;
}) {
  const { t } = useTranslation('dashboard');
  const [newPerk, setNewPerk] = useState('');

  const addPerk = () => {
    const trimmed = newPerk.trim();
    if (trimmed && !perks.includes(trimmed)) {
      onChange([...perks, trimmed]);
      setNewPerk('');
    }
  };

  const removePerk = (index: number) => {
    onChange(perks.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-navy">
        <Gift className="h-5 w-5 text-primary" />
        {t('branding.perksAndBenefits')}
      </h3>

      <div className="mb-3 flex flex-wrap gap-2">
        {perks.map((perk, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
          >
            {perk}
            <button
              type="button"
              onClick={() => removePerk(index)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
              aria-label={t('branding.removePerk')}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={newPerk}
          onChange={(e) => setNewPerk(e.target.value)}
          placeholder={t('branding.perkPlaceholder')}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPerk())}
        />
        <Button size="sm" onClick={addPerk} disabled={!newPerk.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

function TeamPhotosSection({
  photos,
  onChange,
}: {
  photos: string[];
  onChange: (v: string[]) => void;
}) {
  const { t } = useTranslation('dashboard');

  const updatePhoto = (index: number, url: string) => {
    onChange(photos.map((p, i) => (i === index ? url : p)));
  };

  const addPhoto = () => {
    if (photos.length < 6) {
      onChange([...photos, '']);
    }
  };

  const removePhoto = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-navy">
        <Image className="h-5 w-5 text-primary" />
        {t('branding.teamPhotos')}
      </h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((url, index) => (
          <div key={index} className="space-y-2">
            <div className="relative aspect-video overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700">
              {url ? (
                <img
                  src={url}
                  alt={`${t('branding.teamPhoto')} ${index + 1}`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Image className="h-8 w-8 text-gray-300" />
                </div>
              )}
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute right-1 top-1 rounded-full bg-white/80 p-1 text-gray-500 hover:bg-white hover:text-red-500 dark:bg-gray-800/80"
                aria-label={t('branding.removePhoto')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <Input
              value={url}
              onChange={(e) => updatePhoto(index, e.target.value)}
              placeholder={t('branding.imageUrlPlaceholder')}
            />
          </div>
        ))}

        {photos.length < 6 && (
          <button
            type="button"
            onClick={addPhoto}
            className="flex aspect-video items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-primary hover:text-primary dark:border-gray-600 dark:hover:border-primary"
          >
            <Plus className="h-6 w-6" />
          </button>
        )}
      </div>
    </Card>
  );
}

function CompanyVideoSection({
  url,
  onChange,
}: {
  url: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation('dashboard');

  const getEmbedUrl = (input: string): string | null => {
    const ytMatch = input.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    );
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

    const vimeoMatch = input.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

    return null;
  };

  const embedUrl = getEmbedUrl(url);

  return (
    <Card>
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-navy">
        <Video className="h-5 w-5 text-primary" />
        {t('branding.companyVideo')}
      </h3>

      <Input
        value={url}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('branding.videoUrlPlaceholder')}
      />

      {embedUrl && (
        <div className="mt-3 aspect-video overflow-hidden rounded-lg">
          <iframe
            src={embedUrl}
            title={t('branding.companyVideo')}
            className="h-full w-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      )}
    </Card>
  );
}

function SocialLinksSection({
  links,
  onChange,
}: {
  links: SocialLinks;
  onChange: (v: SocialLinks) => void;
}) {
  const { t } = useTranslation('dashboard');

  const fields = [
    { key: 'linkedin' as const, label: 'LinkedIn', icon: Linkedin },
    { key: 'twitter' as const, label: 'Twitter', icon: Twitter },
    { key: 'instagram' as const, label: 'Instagram', icon: Instagram },
    { key: 'facebook' as const, label: 'Facebook', icon: Facebook },
  ];

  return (
    <Card>
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-navy">
        <Globe className="h-5 w-5 text-primary" />
        {t('branding.socialLinks')}
      </h3>

      <div className="space-y-3">
        {fields.map(({ key, label, icon: Icon }) => (
          <div key={key} className="flex items-center gap-3">
            <Icon className="h-5 w-5 shrink-0 text-gray-400" />
            <Input
              value={links[key]}
              onChange={(e) => onChange({ ...links, [key]: e.target.value })}
              placeholder={`${label} ${t('branding.urlSuffix')}`}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

function BrandingPreview({
  data,
  open,
  onClose,
}: {
  data: BrandingData;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation('dashboard');

  return (
    <Modal open={open} onClose={onClose} title={t('branding.previewTitle')} className="max-w-2xl">
      <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
        {data.companyStory && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-navy">{t('branding.companyStory')}</h4>
            <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
              {data.companyStory}
            </p>
          </div>
        )}

        {data.cultureValues.length > 0 && (
          <div>
            <h4 className="mb-3 text-sm font-semibold text-navy">{t('branding.cultureValues')}</h4>
            <div className="grid grid-cols-2 gap-3">
              {data.cultureValues.map((val, i) => {
                const Icon = getIconComponent(val.icon);
                return (
                  <div
                    key={i}
                    className="rounded-lg border border-gray-100 p-3 dark:border-gray-700"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium text-navy">{val.title}</span>
                    </div>
                    <p className="text-xs text-gray-500">{val.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {data.perks.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-navy">
              {t('branding.perksAndBenefits')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {data.perks.map((perk, i) => (
                <span
                  key={i}
                  className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400"
                >
                  {perk}
                </span>
              ))}
            </div>
          </div>
        )}

        {data.teamPhotos.filter(Boolean).length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-navy">{t('branding.teamPhotos')}</h4>
            <div className="grid grid-cols-3 gap-2">
              {data.teamPhotos
                .filter(Boolean)
                .map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`${t('branding.teamPhoto')} ${i + 1}`}
                    className="aspect-video rounded-lg object-cover"
                  />
                ))}
            </div>
          </div>
        )}

        {data.companyVideo && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-navy">{t('branding.companyVideo')}</h4>
            {(() => {
              const ytMatch = data.companyVideo.match(
                /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
              );
              const vimeoMatch = data.companyVideo.match(/vimeo\.com\/(?:video\/)?(\d+)/);
              const embedSrc = ytMatch
                ? `https://www.youtube.com/embed/${ytMatch[1]}`
                : vimeoMatch
                  ? `https://player.vimeo.com/video/${vimeoMatch[1]}`
                  : null;
              return embedSrc ? (
                <div className="aspect-video overflow-hidden rounded-lg">
                  <iframe
                    src={embedSrc}
                    title={t('branding.companyVideo')}
                    className="h-full w-full"
                    allowFullScreen
                  />
                </div>
              ) : null;
            })()}
          </div>
        )}

        {Object.values(data.socialLinks).some(Boolean) && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-navy">{t('branding.socialLinks')}</h4>
            <div className="flex gap-3">
              {data.socialLinks.linkedin && (
                <a href={data.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-primary">
                  <Linkedin className="h-5 w-5" />
                </a>
              )}
              {data.socialLinks.twitter && (
                <a href={data.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-primary">
                  <Twitter className="h-5 w-5" />
                </a>
              )}
              {data.socialLinks.instagram && (
                <a href={data.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-primary">
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {data.socialLinks.facebook && (
                <a href={data.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-primary">
                  <Facebook className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function EmployerBrandingPage() {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const qc = useQueryClient();
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: serverData, isLoading } = useQuery({
    queryKey: ['client', 'branding'],
    queryFn: () =>
      api.get<BrandingData>('/clients/me/branding').then((r) => r.data),
  });

  const [branding, setBranding] = useState<BrandingData | null>(null);

  const current = branding ?? serverData ?? EMPTY_BRANDING;

  const update = <K extends keyof BrandingData>(key: K, value: BrandingData[K]) => {
    setBranding((prev) => ({ ...(prev ?? serverData ?? EMPTY_BRANDING), [key]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: () => api.patch('/clients/me/branding', current).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', 'branding'] });
      notify(t('branding.saved'), 'success');
    },
    onError: () => notify(t('branding.saveFailed'), 'error'),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl">
        <Breadcrumbs
          items={[
            { label: t('common:dashboard'), to: '/company/profile' },
            { label: t('branding.heading') },
          ]}
        />
        <h1 className="mb-6 font-heading text-2xl font-bold text-navy">
          {t('branding.heading')}
        </h1>
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs
        items={[
          { label: t('common:dashboard'), to: '/company/profile' },
          { label: t('branding.heading') },
        ]}
      />
      <h1 className="mb-6 font-heading text-2xl font-bold text-navy">
        {t('branding.heading')}
      </h1>

      <div className="space-y-4">
        <CompanyStorySection
          value={current.companyStory}
          onChange={(v) => update('companyStory', v)}
        />

        <CultureValuesSection
          values={current.cultureValues}
          onChange={(v) => update('cultureValues', v)}
        />

        <PerksSection perks={current.perks} onChange={(v) => update('perks', v)} />

        <TeamPhotosSection
          photos={current.teamPhotos}
          onChange={(v) => update('teamPhotos', v)}
        />

        <CompanyVideoSection
          url={current.companyVideo}
          onChange={(v) => update('companyVideo', v)}
        />

        <SocialLinksSection
          links={current.socialLinks}
          onChange={(v) => update('socialLinks', v)}
        />
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={() => setPreviewOpen(true)}>
          <Eye className="mr-1.5 h-4 w-4" />
          {t('branding.preview')}
        </Button>
        <Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>
          <Save className="mr-1.5 h-4 w-4" />
          {t('branding.save')}
        </Button>
      </div>

      <BrandingPreview data={current} open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </div>
  );
}
