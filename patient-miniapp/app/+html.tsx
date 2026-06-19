import type { PropsWithChildren } from "react";

const appStoreId = process.env.EXPO_PUBLIC_ESSOS_APP_STORE_ID;

export default function Html({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          content={[
            appStoreId ? `app-id=${appStoreId}` : null,
            "app-clip-bundle-id=com.essos.concierge.patientmini.Clip",
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
        <style>
          {
            "html,body,body>div,body>div>div{height:100%;}html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}body{background:#11110F;}"
          }
        </style>
      </head>
      <body>{children}</body>
    </html>
  );
}
