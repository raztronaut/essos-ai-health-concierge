import type { PropsWithChildren } from "react";

const appStoreId = process.env.EXPO_PUBLIC_ESSOS_APP_STORE_ID;

export default function Html({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          content="width=device-width, initial-scale=1, viewport-fit=cover"
          name="viewport"
        />
        <meta content="#11110F" name="theme-color" />
        <meta content="telephone=no" name="format-detection" />
        <title>Essos Patient Card</title>
        <meta
          content="View your Essos itinerary, clinic details, confirmations, transport, and source documents."
          name="description"
        />
        <meta content="Essos Patient Card" property="og:title" />
        <meta content="Essos" property="og:site_name" />
        <meta
          content="Itinerary, clinic details, confirmations, transport, and source documents in one patient card."
          property="og:description"
        />
        <meta content="website" property="og:type" />
        <meta content="https://patient-miniapp.vercel.app" property="og:url" />
        <meta
          content={[
            appStoreId ? `app-id=${appStoreId}` : null,
            "app-clip-bundle-id=com.essos.raziworktrial.Clip",
            "app-clip-display=card",
          ]
            .filter(Boolean)
            .join(", ")}
          name="apple-itunes-app"
        />
        <meta
          content="https://essos-patient-public-assets.s3.us-west-1.amazonaws.com/graphics/essos.png"
          property="og:image"
        />
        <meta content="summary_large_image" name="twitter:card" />
        <meta content="Essos Patient Card" name="twitter:title" />
        <meta
          content="Open itinerary, clinic details, confirmations, transport, and source documents."
          name="twitter:description"
        />
        <style>
          {
            "html,body,body>div,body>div>div{height:100%;min-height:100%;}html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;-webkit-text-size-adjust:100%;box-sizing:border-box;}*,*:before,*:after{box-sizing:inherit;}body{background:#11110F;margin:0;overflow-x:hidden;}"
          }
        </style>
      </head>
      <body>{children}</body>
    </html>
  );
}
