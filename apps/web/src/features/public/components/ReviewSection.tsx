import { useTranslation } from 'react-i18next';

const REVIEWS = [
  {
    text: '"Aajiveka has been an invaluable resource for our finance company. Their job portal consistently delivers highly qualified candidates, saving us time and effort in the hiring process."',
    avatar: '/image/Jyoti.svg',
    name: 'Jyoti Gandhi',
    role: 'Finance company',
  },
  {
    text: '"Aajiveka has revolutionized our hiring process with its efficient job portal. Its user-friendly interface, wide range of job categories, and powerful search filters have made it easy for our IT company to find the right talent quickly."',
    avatar: '/image/kuldeep.svg',
    name: 'Kuldeep Gondaliya',
    role: 'IT Company',
  },
  {
    text: '"Aajiveka has revolutionized our recruitment process. With its extensive database and advanced filtering options, we found top-notch security personnel quickly and efficiently."',
    avatar: '/image/jenny.svg',
    name: 'Saroj Singh',
    role: 'Security Company',
  },
];

/** "Review from our Customers" section (reused on About). */
export function ReviewSection() {
  const { t } = useTranslation('public');
  return (
    <section className="py-12 md:py-20">
      <div className="container">
        <h2 className="text-center">{t('reviews.heading')}</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {REVIEWS.map((r) => (
            <div key={r.name}>
              <div className="rounded-2xl bg-white p-4 shadow-card sm:p-6">
                <p className="text-gray-600">{r.text}</p>
                <img src="/image/Stars.png" alt="5 stars" className="mt-4 h-5" />
              </div>
              <div className="mt-4 flex items-center gap-2 pl-3 sm:gap-3">
                <img src={r.avatar} alt={r.name} className="h-10 w-10 rounded-full sm:h-12 sm:w-12" />
                <div>
                  <h5 className="font-bold text-navy">{r.name}</h5>
                  <p className="text-sm text-gray-500">-{r.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
