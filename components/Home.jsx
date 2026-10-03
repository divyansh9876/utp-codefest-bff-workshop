import Image from "next/image";
import Link from "next/link";
import Icon from "./Icon";
import { Card } from "./ui";
import { HOST, PHASES, SITE_URL, TOTAL_MINUTES } from "@/lib/constants";

const PERSON_LD = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: HOST.name,
  jobTitle: "Backend Engineer",
  description: HOST.headline,
  url: SITE_URL,
  image: `${SITE_URL}${HOST.photo}`,
  sameAs: [HOST.linkedin, HOST.github],
  knowsAbout: ["Java", "Spring Boot", "MongoDB", "JWT", "REST APIs", "Backend-for-Frontend", "Docker"],
};

const NAV = [
  { href: "#about", label: "About" },
  { href: "#work", label: "Work" },
  { href: "#workshop", label: "Workshop" },
  { href: "#contact", label: "Contact" },
];

const STACK = [
  "Java 21",
  "Spring Boot",
  "Spring Security",
  "Spring Data MongoDB",
  "REST API design",
  "JWT auth",
  "MongoDB Atlas",
  "Docker",
  "Render",
  "OpenAPI / Swagger",
  "Log4j2",
  "Next.js",
];

const FOCUS = [
  {
    icon: "server",
    title: "Backend-for-Frontend APIs",
    text: "Thin, purpose-built APIs that keep secrets and business rules on the server and give each UI exactly the data it needs.",
  },
  {
    icon: "shieldCheck",
    title: "Secure by default",
    text: "Hashed passwords, signed tokens, validated input and environment-only secrets from the very first commit.",
  },
  {
    icon: "rocket",
    title: "Shipping to production",
    text: "Containerised Spring Boot services with health checks, structured logs and one-click deploys.",
  },
];

const WORK = [
  {
    icon: "server",
    title: "UTP CodeFest BFF API",
    tag: "Spring Boot · MongoDB · JWT",
    text: "A production-style Backend-for-Frontend: project CRUD, register and login by email or username, BCrypt-hashed passwords, signed JWTs, request-ID logging and OpenAPI docs. Dockerised and deployed on Render.",
    links: [
      { label: "Source", href: "https://github.com/divyansh9876/utp-codefest-bff", icon: "github" },
      { label: "Live API docs", href: "https://utp-codefest-bff.onrender.com/swagger-ui.html", icon: "file" },
    ],
  },
  {
    icon: "monitor",
    title: "Interactive BFF Workshop",
    tag: "Next.js · React",
    text: "A hands-on teaching app that talks to the live API: health checks, a CRUD playground, a JWT inspector, a BCrypt playground and a deploy checklist, built so the audience can watch every request.",
    links: [
      { label: "Open workshop", href: "/workshop", icon: "arrowRight", internal: true },
      { label: "Source", href: "https://github.com/divyansh9876/utp-codefest-bff-workshop", icon: "github" },
    ],
  },
];

function External({ href, className, children }) {
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export default function Home() {
  return (
    <div className="app">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(PERSON_LD).replace(/</g, "\\u003c") }}
      />
      <header className="topbar">
        <div className="container topbar-inner">
          <a href="#about" className="brand brand-link">
            <Image src={HOST.photo} alt="" width={72} height={72} className="host-avatar brand-avatar avatar-photo" priority />
            <span className="brand-text">
              <strong>{HOST.name}</strong>
              <span>{HOST.headline}</span>
            </span>
          </a>
          <nav className="site-nav" aria-label="Sections">
            {NAV.map((n) => (
              <a key={n.href} href={n.href}>
                {n.label}
              </a>
            ))}
          </nav>
          <External className="btn btn-linkedin btn-sm" href={HOST.linkedin}>
            <Icon name="linkedin" size={14} />
            LinkedIn
          </External>
        </div>
      </header>

      <main className="container main about">
        <section id="about" className="about-hero">
          <Image
            src={HOST.photo}
            alt={`Photo of ${HOST.name}`}
            width={264}
            height={264}
            className="about-avatar avatar-photo"
            priority
          />
          <div className="about-intro">
            <span className="about-kicker">Hi, I&apos;m</span>
            <h1>{HOST.name}</h1>
            <p className="about-headline">{HOST.headline}</p>
            <p className="lead">
              I build backend systems with Java and Spring Boot, with a focus on clean API design, security and
              getting services into production. I also enjoy teaching: at UTP CodeFest I&apos;m live-coding a
              Backend-for-Frontend from an empty Spring Boot project to a deployed, JWT-secured API.
            </p>
            <div className="about-actions">
              <External className="btn btn-linkedin btn-lg" href={HOST.linkedin}>
                <Icon name="linkedin" size={17} />
                Connect on LinkedIn
              </External>
              <External className="btn btn-secondary btn-lg" href={HOST.github}>
                <Icon name="github" size={17} />
                GitHub
              </External>
              <Link className="btn btn-ghost btn-lg" href="/workshop">
                <Icon name="zap" size={17} />
                Try my workshop
              </Link>
            </div>
          </div>
        </section>

        <section className="site-section">
          <div className="section-head">
            <span className="about-kicker">What I do</span>
            <h2>Backends that are simple, secure and shippable</h2>
          </div>
          <div className="grid grid-3">
            {FOCUS.map((f) => (
              <Card key={f.title} title={f.title} icon={f.icon}>
                <p className="about-text">{f.text}</p>
              </Card>
            ))}
          </div>
        </section>

        <section id="work" className="site-section">
          <div className="section-head">
            <span className="about-kicker">Featured work</span>
            <h2>Recent projects</h2>
          </div>
          <div className="grid grid-2">
            {WORK.map((w) => (
              <Card key={w.title} title={w.title} subtitle={w.tag} icon={w.icon}>
                <p className="about-text">{w.text}</p>
                <div className="work-links">
                  {w.links.map((l) =>
                    l.internal ? (
                      <Link key={l.href} className="btn btn-primary btn-sm" href={l.href}>
                        {l.label}
                        <Icon name={l.icon} size={14} />
                      </Link>
                    ) : (
                      <External key={l.href} className="btn btn-secondary btn-sm" href={l.href}>
                        <Icon name={l.icon} size={14} />
                        {l.label}
                      </External>
                    ),
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section id="workshop" className="site-section">
          <div className="section-head">
            <span className="about-kicker">Speaking</span>
            <h2>UTP CodeFest: Build a Backend-for-Frontend with Spring Boot</h2>
          </div>
          <div className="workshop-feature">
            <div className="workshop-feature-intro">
              <p className="about-text">
                A {TOTAL_MINUTES / 60}-hour, hands-on session. We start from an empty Spring Boot project and finish
                with a MongoDB-backed, JWT-secured API running in production, while an interactive UI shows every
                request as it happens.
              </p>
              <Link className="btn btn-primary btn-lg" href="/workshop">
                <Icon name="play" size={16} />
                Open the interactive workshop
              </Link>
            </div>
            <ol className="workshop-phases">
              {PHASES.map((p) => (
                <li key={p.id}>
                  <Link href={`/workshop#${p.id}`}>
                    <span className="tab-num">{p.n}</span>
                    <span className="workshop-phase-text">
                      <strong>{p.title}</strong>
                      <small>
                        {p.minutes} min · {p.file}
                      </small>
                    </span>
                    <Icon name="arrowRight" size={14} className="about-link-ext" />
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="site-section">
          <Card title="What I work with" subtitle="Languages, frameworks and tools" icon="layers">
            <div className="about-chips">
              {STACK.map((s) => (
                <span key={s} className="badge badge-primary">
                  {s}
                </span>
              ))}
            </div>
          </Card>
        </section>

        <section id="contact" className="about-cta">
          <div>
            <h2>Let&apos;s build something</h2>
            <p>
              Questions about Spring Boot, BFFs or your CodeFest project? Want to collaborate? Say hi on LinkedIn.
            </p>
          </div>
          <External className="btn btn-linkedin btn-lg" href={HOST.linkedin}>
            <Icon name="linkedin" size={17} />
            Let&apos;s connect
          </External>
        </section>
      </main>

      <footer className="container footer">
        © {new Date().getFullYear()} {HOST.name} ·{" "}
        <External href={HOST.linkedin}>LinkedIn</External> · <External href={HOST.github}>GitHub</External> ·{" "}
        <Link href="/workshop">UTP CodeFest workshop</Link>
      </footer>
    </div>
  );
}
