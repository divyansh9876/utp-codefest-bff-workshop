import { SITE_URL } from "@/lib/constants";

export default function sitemap() {
  const lastModified = new Date();
  return [
    { url: SITE_URL, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/workshop`, lastModified, changeFrequency: "monthly", priority: 0.8 },
  ];
}
