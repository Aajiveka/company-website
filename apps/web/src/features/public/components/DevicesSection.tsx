/** "Aajiveka is available for all devices" download section. */
export function DevicesSection() {
  return (
    <section className="bg-primary-light py-14 text-center text-white">
      <div className="container">
        <h2 className="mb-6 text-white">Aajiveka is available for all devices</h2>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a href="#" aria-label="App Store">
            <img src="/image/App Store.svg" alt="Download on the App Store" className="h-12" />
          </a>
          <a href="#" aria-label="Play Store">
            <img src="/image/Play Store.svg" alt="Get it on Google Play" className="h-12" />
          </a>
        </div>
        <img src="/image/qrcode.png" alt="Scan QR code" className="mx-auto mt-6 h-32 w-32" />
      </div>
    </section>
  );
}
