import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, MapPin } from 'lucide-react';
import { Button, Input, useToast } from '@/components/ui';
import { Seo } from '@/components/Seo';

const contactSchema = z.object({
  name: z.string().min(2, 'Enter your name'),
  subject: z.string().min(2, 'Enter a subject'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().regex(/^\d{10}$/, 'Enter a 10-digit number'),
  feedback: z.string().min(5, 'Please enter your message'),
});
type ContactValues = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const { notify } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({ resolver: zodResolver(contactSchema) });

  const onSubmit = async (_values: ContactValues) => {
    // Wire to POST /api/contact when the backend endpoint is available.
    await new Promise((r) => setTimeout(r, 600));
    notify('Thank you! We will get back to you shortly.', 'success');
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
            <h4 className="text-lg text-gray-600">
              Email us with any questions or inquiries, or call us. We would be happy to answer your questions
              and set up a meeting with you. Whenever you need us, we're here for you.
            </h4>
            <div className="mt-8 space-y-4">
              <h2 className="mb-3">Aajiveka Service</h2>
              <p className="flex items-center gap-2 text-gray-700">
                <Mail className="h-5 w-5 text-primary" /> info@aajiveka.com
              </p>
              <p className="flex items-start gap-2 text-gray-700">
                <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                956 2nd floor, Sector 45, Gurgaon, Haryana - 122002
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="rounded-2xl bg-white p-6 shadow-card md:p-8">
            <h2 className="mb-5">Get in Touch</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <Input label="Name" placeholder="Enter Your Name" error={errors.name?.message} {...register('name')} />
              <Input label="Subject" placeholder="Enter Your Subject" error={errors.subject?.message} {...register('subject')} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Email" type="email" placeholder="Enter Your Email" error={errors.email?.message} {...register('email')} />
                <Input label="Contact Number" inputMode="numeric" placeholder="Enter Contact number" error={errors.phone?.message} {...register('phone')} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy" htmlFor="feedback">
                  Feedback
                </label>
                <textarea
                  id="feedback"
                  rows={4}
                  placeholder="Enter Your Feedback"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                  {...register('feedback')}
                />
                {errors.feedback && <p className="mt-1 text-xs text-danger">{errors.feedback.message}</p>}
              </div>
              <Button type="submit" isLoading={isSubmitting}>
                Submit
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
