import { useTranslation } from 'react-i18next';

/** "Aajiveka is available for all devices" download section. */
export function DevicesSection() {
  const { t } = useTranslation('public');
  return (
    <section className="bg-primary-light py-8 text-center text-white sm:py-14">
      <div className="container">
        <h2 className="mb-6 text-white">{t('devices.heading')}</h2>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a href="#" aria-label="App Store">
            <img src="/image/App Store.svg" alt={t('devices.appStore')} className="h-10 sm:h-12" />
          </a>
          <a href="#" aria-label="Play Store">
            <img src="/image/Play Store.svg" alt={t('devices.playStore')} className="h-10 sm:h-12" />
          </a>
        </div>
        <img src="/image/qrcode.png" alt={t('devices.qrCode')} className="mx-auto mt-6 h-24 w-24 sm:h-32 sm:w-32" />
      </div>
    </section>
  );
}
