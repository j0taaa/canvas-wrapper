import type { Metadata } from "next";
import { getPrivacyPolicyContent, PRIVACY_POLICY_CONTACT_EMAIL, PRIVACY_POLICY_EFFECTIVE_DATE, t } from "@canvas/shared";
import { getRequestLocale } from "@/lib/request-locale";

export const metadata: Metadata = {
  title: "Privacy Policy | Janvas",
  description: "Privacy Policy for Janvas.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy Policy | Janvas",
    description: "Privacy Policy for Janvas.",
    url: "/privacy",
    type: "article",
  },
};

export default async function PrivacyPage() {
  const { resolvedLocale } = await getRequestLocale();
  const policy = getPrivacyPolicyContent(resolvedLocale);
  const formattedDate = new Intl.DateTimeFormat(resolvedLocale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(PRIVACY_POLICY_EFFECTIVE_DATE));

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <article className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="rounded-3xl border border-border/80 bg-card p-6">
          <h1 className="text-3xl font-semibold">{t(resolvedLocale, "common.privacyPolicy")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t(resolvedLocale, "common.lastUpdated")}: {formattedDate}
          </p>
          <div className="mt-4 space-y-3 text-sm leading-7 text-foreground">
            {policy.intro.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>

        {policy.sections.map((section) => (
          <section key={section.title} className="rounded-3xl border border-border/80 bg-card p-6">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-foreground">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets ? (
                <ul className="list-disc space-y-2 pl-5 text-sm leading-7">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        ))}

        <div className="rounded-3xl border border-border/80 bg-card p-6 text-sm text-muted-foreground">
          {PRIVACY_POLICY_CONTACT_EMAIL}
        </div>
      </article>
    </main>
  );
}
