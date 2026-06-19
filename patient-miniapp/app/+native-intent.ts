export function redirectSystemPath({ path }: { path: string }): string {
  try {
    const url = new URL(path);
    if (url.hostname === "appclip.apple.com") {
      const bundle = url.searchParams.get("p");
      const token = url.searchParams.get("token") ?? "demo";
      if (bundle === "com.essos.raziworktrial.Clip") {
        return `/p/${token}`;
      }
    }
  } catch {
    return path;
  }
  return path;
}
