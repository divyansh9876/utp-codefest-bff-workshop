import Script from "next/script";

// IDs are interpolated into inline scripts, so only accept their documented formats.
const CLARITY_ID = /^[a-z0-9]{6,20}$/i.test(process.env.NEXT_PUBLIC_CLARITY_ID || "")
  ? process.env.NEXT_PUBLIC_CLARITY_ID
  : null;
const GA_ID = /^G-[A-Z0-9]{4,16}$/.test(process.env.NEXT_PUBLIC_GA_ID || "") ? process.env.NEXT_PUBLIC_GA_ID : null;

export default function Analytics() {
  return (
    <>
      {CLARITY_ID && (
        <Script id="ms-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");`}
        </Script>
      )}
      {GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","${GA_ID}");`}
          </Script>
        </>
      )}
    </>
  );
}
