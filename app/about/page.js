import About from "@/components/About";
import { HOST } from "@/lib/constants";

export const metadata = {
  title: `${HOST.name} · UTP CodeFest BFF Workshop`,
  description: `${HOST.name}, ${HOST.headline}. Host of the UTP CodeFest Backend-for-Frontend workshop.`,
};

export default function AboutPage() {
  return <About />;
}
