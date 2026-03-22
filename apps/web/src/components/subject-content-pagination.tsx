import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { t, type AppLocale, type SubjectContentNavigationTarget } from "@canvas/shared";
import { buttonVariants } from "@/components/ui/button";

function getTargetTitle(locale: AppLocale, target: SubjectContentNavigationTarget | null) {
  if (!target) {
    return null;
  }

  if (target.title) {
    return target.title;
  }

  switch (target.kind) {
    case "page":
      return t(locale, "subjects.untitledPage");
    case "file":
      return t(locale, "subjects.untitledFile");
    case "quiz":
      return t(locale, "subjects.untitledQuiz");
    case "assignment":
      return t(locale, "subjects.assignments");
  }
}

type SubjectContentPaginationProps = {
  locale: AppLocale;
  next: SubjectContentNavigationTarget | null;
  previous: SubjectContentNavigationTarget | null;
};

export function SubjectContentPagination({
  locale,
  next,
  previous,
}: SubjectContentPaginationProps) {
  if (!previous && !next) {
    return null;
  }

  const previousTitle = getTargetTitle(locale, previous);
  const nextTitle = getTargetTitle(locale, next);

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      {previous ? (
        <Link
          href={previous.href}
          className={`${buttonVariants({ variant: "outline", size: "lg" })} h-auto justify-start px-4 py-3 text-left`}
        >
          <ArrowLeft className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0">
            <span className="block text-xs text-black/55">{t(locale, "subjects.previousContent")}</span>
            <span className="block truncate text-sm text-black">{previousTitle}</span>
          </span>
        </Link>
      ) : (
        <div className="hidden sm:block" />
      )}

      {next ? (
        <Link
          href={next.href}
          className={`${buttonVariants({ variant: "default", size: "lg" })} h-auto justify-end px-4 py-3 text-right`}
        >
          <span className="min-w-0">
            <span className="block text-xs text-current/75">{t(locale, "subjects.nextContent")}</span>
            <span className="block truncate text-sm">{nextTitle}</span>
          </span>
          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0" />
        </Link>
      ) : (
        <div className="hidden sm:block" />
      )}
    </div>
  );
}
