import Script from "next/script";

// Google Analytics 4 (gtag.js) — loaded globally so page views are tracked
// across the whole site. Client-side App Router navigations are captured by
// GA4's default Enhanced Measurement (browser history events).
const GA_MEASUREMENT_ID = "G-PE9VH5QX4R";

export default function GoogleAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />

      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}
