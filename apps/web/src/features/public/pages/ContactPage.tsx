import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Input, useToast } from '@/components/ui';
import { Seo } from '@/components/Seo';

export default function ContactPage() {
  const { t } = useTranslation('public');
  const { notify } = useToast();

  const contactSchema = z.object({
    name: z.string().min(2, t('contact.nameError')),
    subject: z.string().min(2, t('contact.subjectError')),
    email: z.string().email(t('contact.emailError')),
    phone: z.string().regex(/^\d{10}$/, t('contact.phoneError')),
    feedback: z.string().min(5, t('contact.feedbackError')),
  });
  type ContactValues = z.infer<typeof contactSchema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({ resolver: zodResolver(contactSchema) });

  const onSubmit = async (_values: ContactValues) => {
    await new Promise((r) => setTimeout(r, 600));
    notify(t('contact.successMessage'), 'success');
    reset();
  };

  return (
    <section className="pt-28 pb-16">
      <Seo
        title="Contact Us"
        description="Get in touch with Aajiveka. Reach out for support, partnership enquiries, or feedback. We're here to help you with your career and recruitment needs."
        path="/contact"
      />
      <div className="container">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* Info */}
          <div>
            <h4 className="text-lg text-gray-600">{t('contact.infoText')}</h4>
            <div className="mt-8 space-y-4">
              <h2 className="mb-3">{t('contact.serviceHeading')}</h2>
              <p className="flex items-center gap-2 text-gray-700">
                <Mail className="h-5 w-5 text-primary" /> {t('contact.email')}
              </p>
              <p className="flex items-start gap-2 text-gray-700">
                <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                {t('contact.address')}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="rounded-2xl bg-white p-6 shadow-card md:p-8">
            <h2 className="mb-5">{t('contact.formHeading')}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <Input label={t('contact.name')} placeholder={t('contact.namePlaceholder')} error={errors.name?.message} {...register('name')} />
              <Input label={t('contact.subject')} placeholder={t('contact.subjectPlaceholder')} error={errors.subject?.message} {...register('subject')} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label={t('contact.emailLabel')} type="email" placeholder={t('contact.emailPlaceholder')} error={errors.email?.message} {...register('email')} />
                <Input label={t('contact.contactNumber')} inputMode="numeric" placeholder={t('contact.contactPlaceholder')} error={errors.phone?.message} {...register('phone')} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy" htmlFor="feedback">
                  {t('contact.feedback')}
                </label>
                <textarea
                  id="feedback"
                  rows={4}
                  placeholder={t('contact.feedbackPlaceholder')}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                  {...register('feedback')}
                />
                {errors.feedback && <p className="mt-1 text-xs text-danger">{errors.feedback.message}</p>}
              </div>
              <Button type="submit" isLoading={isSubmitting}>
                {t('actions.submit', { ns: 'common' })}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
