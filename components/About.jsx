import Link from "next/link";
import Icon from "./Icon";
import { Card } from "./ui";
import { HOST } from "@/lib/constants";

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

const LINKS = [
  {
    icon: "monitor",
    label: "Workshop frontend",
    detail: "Next.js UI · source",
    href: "https://github.com/divyansh9876/utp-codefest-bff-workshop",
  },
  {
    icon: "server",
    label: "Spring Boot BFF",
    detail: "Java + MongoDB + JWT · source",
    href: "https://github.com/divyansh9876/utp-codefest-bff",
  },
  {
    icon: "file",
    label: "Live API docs",
    detail: "Swagger UI on Render",
    href: "https://utp-codefest-bff.onrender.com/swagger-ui.html",
  },
];

export default function About() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="container topbar-inner">
          <Link href="/" className="brand brand-link">
            <span className="brand-mark">
              <Icon name="zap" size={18} strokeWidth={2.5} />
            </span>
            <span className="brand-text">
              <strong>UTP CodeFest</strong>
              <span>BFF Workshop · Spring Boot + MongoDB + JWT</span>
            </span>
          </Link>
          <Link href="/" className="btn btn-secondary btn-sm">
            <Icon name="arrowLeft" size={14} />
            Back to workshop
          </Link>
        </div>
      </header>

      <main className="container main about">
        <section className="about-hero">
          <div className="about-avatar" aria-hidden="true">
            {HOST.initials}
          </div>
          <div className="about-intro">
            <span className="about-kicker">Your workshop host</span>
            <h1>{HOST.name}</h1>
            <p className="about-headline">{HOST.headline}</p>
            <p className="lead">
              I build backend systems with Java and Spring Boot, with a focus on clean API design, security and
              getting services into production. At UTP CodeFest I&apos;m live-coding a Backend-for-Frontend
              from an empty Spring Boot project to a deployed, JWT-secured API.
            </p>
            <div className="about-actions">
              <a className="btn btn-linkedin btn-lg" href={HOST.linkedin} target="_blank" rel="noopener noreferrer">
                <Icon name="linkedin" size={17} />
                Connect on LinkedIn
              </a>
              <a className="btn btn-secondary btn-lg" href={HOST.github} target="_blank" rel="noopener noreferrer">
                <Icon name="github" size={17} />
                GitHub
              </a>
            </div>
          </div>
        </section>

        <div className="grid grid-3">
          {FOCUS.map((f) => (
            <Card key={f.title} title={f.title} icon={f.icon}>
              <p className="about-text">{f.text}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-2">
          <Card title="What I work with" subtitle="The stack behind this workshop" icon="layers">
            <div className="about-chips">
              {STACK.map((s) => (
                <span key={s} className="badge badge-primary">
                  {s}
                </span>
              ))}
            </div>
          </Card>

          <Card title="Workshop resources" subtitle="Everything we build today is open source" icon="git">
            <ul className="about-links">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer">
                    <Icon name={l.icon} size={16} />
                    <span>
                      <strong>{l.label}</strong>
                      <small>{l.detail}</small>
                    </span>
                    <Icon name="external" size={14} className="about-link-ext" />
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <section className="about-cta">
          <div>
            <h2>Enjoyed the workshop?</h2>
            <p>Say hi on LinkedIn. I&apos;m happy to answer questions about Spring Boot, BFFs or your CodeFest project.</p>
          </div>
          <a className="btn btn-linkedin btn-lg" href={HOST.linkedin} target="_blank" rel="noopener noreferrer">
            <Icon name="linkedin" size={17} />
            Let&apos;s connect
          </a>
        </section>
      </main>

      <footer className="container footer">
        Built for UTP CodeFest by {HOST.name} ·{" "}
        <a href={HOST.linkedin} target="_blank" rel="noopener noreferrer">
          LinkedIn
        </a>
      </footer>
    </div>
  );
}
