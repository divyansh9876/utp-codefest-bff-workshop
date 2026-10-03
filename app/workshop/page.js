import Workshop from "@/components/Workshop";

const TITLE = "UTP CodeFest · BFF Workshop by Divyansh Bhatt";
const DESCRIPTION =
  "Interactive Backend-for-Frontend workshop: Spring Boot, MongoDB Atlas, BCrypt + JWT auth, and secure deployment.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/workshop" },
  openGraph: { type: "website", url: "/workshop", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function WorkshopPage() {
  return <Workshop />;
}
