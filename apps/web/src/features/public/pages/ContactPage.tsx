import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, MapPin } from 'lucide-react';
import { Button, Input, Textarea, useToast } from '@/components/ui';
import { Seo } from '@/components/Seo';

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name'),
  subject: z.string().trim().min(2, 'Enter a subject'),
  email: z.string().trim().email('Enter a valid email'),
  phone: z.string().regex(/^\d{10}$/, 'Enter a 10-digit number'),
  feedback: z.string().trim().min(5, 'Please enter your message'),
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
              <Input label="Name" required placeholder="Enter Your Name" autoComplete="name" error={errors.name?.message} {...register('name')} />
              <Input label="Subject" required placeholder="Enter Your Subject" error={errors.subject?.message} {...register('subject')} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Email" type="email" required placeholder="Enter Your Email" autoComplete="email" error={errors.email?.message} {...register('email')} />
                <Input label="Contact Number" required inputMode="numeric" placeholder="Enter Contact number" autoComplete="tel" error={errors.phone?.message} {...register('phone')} />
              </div>
              <Textarea
                label="Feedback"
                required
                rows={4}
                placeholder="Enter Your Feedback"
                error={errors.feedback?.message}
                {...register('feedback')}
              />
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
