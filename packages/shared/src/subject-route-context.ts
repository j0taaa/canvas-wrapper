export const SUBJECT_ROUTE_TABS = [
  "overview",
  "modules",
  "assignments",
  "grades",
  "people",
  "forums",
  "files",
] as const;

export type SubjectRouteTab = typeof SUBJECT_ROUTE_TABS[number];
export type SubjectPeopleView = "people" | "groups";

export type SubjectRouteContext = {
  peopleView?: SubjectPeopleView;
  tab?: SubjectRouteTab;
};

export function isSubjectRouteTab(value?: string | null): value is SubjectRouteTab {
  return SUBJECT_ROUTE_TABS.includes(value as SubjectRouteTab);
}

export function getSubjectRouteContext(tab?: string | null, peopleView?: string | null): SubjectRouteContext | undefined {
  if (peopleView === "groups") {
    return { peopleView: "groups", tab: "people" };
  }

  if (!isSubjectRouteTab(tab)) {
    return undefined;
  }

  return { tab };
}

export function appendSubjectRouteContext(href: string, context?: SubjectRouteContext) {
  if (!context || !href.startsWith("/")) {
    return href;
  }

  const url = new URL(href, "https://canvas-wrapper.local");

  if (context.tab) {
    url.searchParams.set("tab", context.tab);
  }

  if (context.tab === "people" && context.peopleView === "groups") {
    url.searchParams.set("peopleView", "groups");
  } else {
    url.searchParams.delete("peopleView");
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export function buildSubjectHref(courseId: number | string, context?: SubjectRouteContext) {
  return appendSubjectRouteContext(`/subjects/${courseId}`, context);
}
