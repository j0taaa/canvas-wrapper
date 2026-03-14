"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowLeft, LoaderCircle, MailPlus, Search, SendHorizonal, UsersRound, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatSubjectName, getSubjectColorStyle } from "@/lib/utils";

type ComposeMessageFormProps = {
  courses: Array<{
    id: number;
    name: string;
    course_code?: string;
  }>;
  currentUserId: number;
  initialCoursePeople: Array<{
    id: number;
    name: string;
    short_name?: string;
    sortable_name?: string;
    avatar_url?: string;
  }>;
};

const fieldClassName =
  "w-full rounded-2xl border border-border/80 bg-background px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20";

type CoursePerson = ComposeMessageFormProps["initialCoursePeople"][number];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ComposeMessageForm({ courses, currentUserId, initialCoursePeople }: ComposeMessageFormProps) {
  const router = useRouter();
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(courses[0]?.id ?? null);
  const [courseSearch, setCourseSearch] = useState("");
  const [peopleByCourseId, setPeopleByCourseId] = useState<Record<number, CoursePerson[]>>(
    selectedCourseId ? { [selectedCourseId]: initialCoursePeople } : {},
  );
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<number[]>([]);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sendIndividualMessages, setSendIndividualMessages] = useState(false);
  const [isLoadingPeople, setIsLoadingPeople] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? null;
  const filteredCourses = useMemo(() => {
    const query = courseSearch.trim().toLowerCase();

    if (!query) {
      return courses;
    }

    return courses.filter((course) => {
      const fullText = [course.name, course.course_code].filter(Boolean).join(" ").toLowerCase();
      return fullText.includes(query);
    });
  }, [courseSearch, courses]);
  const coursePeople = useMemo(
    () => (selectedCourseId ? peopleByCourseId[selectedCourseId] ?? [] : []),
    [peopleByCourseId, selectedCourseId],
  );
  const availablePeople = useMemo(
    () => coursePeople.filter((person) => person.id !== currentUserId),
    [coursePeople, currentUserId],
  );
  const selectedRecipients = useMemo(
    () => availablePeople.filter((person) => selectedRecipientIds.includes(person.id)),
    [availablePeople, selectedRecipientIds],
  );
  const filteredPeople = useMemo(() => {
    const query = recipientSearch.trim().toLowerCase();

    if (!query) {
      return availablePeople;
    }

    return availablePeople.filter((person) => {
      const fullText = [
        person.name,
        person.short_name,
        person.sortable_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return fullText.includes(query);
    });
  }, [availablePeople, recipientSearch]);
  const canSend = Boolean(selectedCourseId && selectedRecipientIds.length > 0 && subject.trim() && message.trim());

  useEffect(() => {
    if (!selectedCourseId || peopleByCourseId[selectedCourseId]) {
      return;
    }

    let isCancelled = false;
    setIsLoadingPeople(true);

    fetch(`/api/courses/${selectedCourseId}/people`)
      .then(async (response) => {
        const payload = (await response.json()) as CoursePerson[] | { error?: string };

        if (!response.ok) {
          throw new Error("error" in payload ? payload.error ?? "Unable to load recipients." : "Unable to load recipients.");
        }

        if (isCancelled) {
          return;
        }

        setPeopleByCourseId((current) => ({
          ...current,
          [selectedCourseId]: Array.isArray(payload) ? payload : [],
        }));
      })
      .catch((loadError) => {
        if (isCancelled) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load recipients.");
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingPeople(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [peopleByCourseId, selectedCourseId]);

  const handleSubmit = () => {
    if (!canSend || !selectedCourseId) {
      setError("Choose a subject, pick at least one recipient, add a title, and write a message first.");
      return;
    }

    setError("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/inbox/conversations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            body: message,
            courseId: selectedCourseId,
            recipientIds: selectedRecipientIds,
            sendIndividualMessages,
            subject,
          }),
        });

        const payload = (await response.json()) as {
          conversationId?: number | null;
          error?: string;
          queued?: boolean;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to send message.");
        }

        if (payload.conversationId) {
          router.push(`/inbox/${payload.conversationId}?sent=1`);
          return;
        }

        router.push(`/inbox?sent=1${payload.queued ? "&mode=queued" : ""}`);
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Unable to send message.");
      }
    });
  };

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-6">
      <div className="flex items-center justify-between gap-3 border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/inbox"
            aria-label="Back to inbox"
            className={buttonVariants({ variant: "outline", size: "icon-sm" })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">New message</h1>
            <p className="text-sm text-muted-foreground">Start a Canvas conversation without leaving the app.</p>
          </div>
        </div>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!canSend || isPending}
          className="hidden sm:inline-flex"
        >
          {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
          <span>{isPending ? "Sending..." : "Send"}</span>
        </Button>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-3xl border border-border/80 bg-card/95 p-5">
            <div className="mb-4 flex items-center gap-2">
              <MailPlus className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Send to</h2>
            </div>
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={courseSearch}
                onChange={(event) => setCourseSearch(event.target.value)}
                placeholder="Search subjects"
                className={`${fieldClassName} pl-10`}
              />
            </div>
            {courses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active subjects are available for messaging right now.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto pr-1">
                <div className="grid gap-3 sm:grid-cols-2">
                {filteredCourses.map((course) => {
                  const colorStyle = getSubjectColorStyle(course.name);
                  const isSelected = course.id === selectedCourseId;

                  return (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => {
                        setSelectedCourseId(course.id);
                        setSelectedRecipientIds([]);
                        setRecipientSearch("");
                        setError("");
                      }}
                      className={
                        isSelected
                          ? "rounded-2xl border border-border bg-muted/80 p-4 text-left shadow-sm"
                          : "rounded-2xl border border-border/70 bg-background/65 p-4 text-left transition hover:border-foreground/15 hover:bg-muted/55"
                      }
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: colorStyle.borderColor }}
                        />
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-medium text-foreground">
                            {formatSubjectName(course.name)}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {course.course_code ?? course.name}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
                </div>
                {filteredCourses.length === 0 && (
                  <div className="rounded-2xl border border-border/70 bg-background/65 px-4 py-3 text-sm text-muted-foreground">
                    No subjects matched your search.
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-border/80 bg-card/95 p-5">
            <div className="mb-4 flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recipients</h2>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={recipientSearch}
                onChange={(event) => setRecipientSearch(event.target.value)}
                placeholder={selectedCourse ? "Search people in this subject" : "Choose a subject first"}
                className={`${fieldClassName} pl-10`}
                disabled={!selectedCourseId || isLoadingPeople}
              />
            </div>

            {selectedRecipients.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedRecipients.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => setSelectedRecipientIds((current) => current.filter((recipientId) => recipientId !== person.id))}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5 text-sm text-foreground transition hover:border-foreground/15 hover:bg-muted/55"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-muted text-xs text-muted-foreground">
                      {getInitials(person.name)}
                    </span>
                    <span className="truncate">{person.name}</span>
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
              {isLoadingPeople && (
                <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/65 px-4 py-3 text-sm text-muted-foreground">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  <span>Loading recipients...</span>
                </div>
              )}

              {!isLoadingPeople && selectedCourseId && filteredPeople.length === 0 && (
                <div className="rounded-2xl border border-border/70 bg-background/65 px-4 py-3 text-sm text-muted-foreground">
                  {availablePeople.length === 0
                    ? "No people are available for this subject."
                    : "No recipients matched your search."}
                </div>
              )}

              {!isLoadingPeople &&
                filteredPeople.map((person) => {
                  const isSelected = selectedRecipientIds.includes(person.id);

                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() =>
                        setSelectedRecipientIds((current) =>
                          current.includes(person.id)
                            ? current.filter((recipientId) => recipientId !== person.id)
                            : [...current, person.id],
                        )
                      }
                      className={
                        isSelected
                          ? "flex w-full items-center gap-3 rounded-2xl border border-border bg-muted/80 px-4 py-3 text-left shadow-sm"
                          : "flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-background/65 px-4 py-3 text-left transition hover:border-foreground/15 hover:bg-muted/55"
                      }
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted text-sm font-medium text-muted-foreground">
                        {getInitials(person.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{person.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {person.short_name ?? person.sortable_name ?? "Canvas user"}
                        </span>
                      </span>
                      <span
                        className={
                          isSelected
                            ? "h-3 w-3 rounded-full bg-primary"
                            : "h-3 w-3 rounded-full border border-border/80"
                        }
                      />
                    </button>
                  );
                })}
            </div>
          </section>

          <section className="rounded-3xl border border-border/80 bg-card/95 p-5">
            <div className="mb-4 flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Delivery</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSendIndividualMessages(false)}
                className={
                  !sendIndividualMessages
                    ? "rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                    : "rounded-full border border-border/70 bg-background px-4 py-2 text-sm text-muted-foreground transition hover:border-border hover:text-foreground"
                }
              >
                Shared thread
              </button>
              <button
                type="button"
                onClick={() => setSendIndividualMessages(true)}
                className={
                  sendIndividualMessages
                    ? "rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                    : "rounded-full border border-border/70 bg-background px-4 py-2 text-sm text-muted-foreground transition hover:border-border hover:text-foreground"
                }
              >
                Separate private messages
              </button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {sendIndividualMessages
                ? "Canvas sends one private copy to each person in the selected subject."
                : "Everyone in the selected subject receives the same shared conversation thread."}
            </p>
          </section>

          <section className="rounded-3xl border border-border/80 bg-card/95 p-5">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">Subject</span>
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Message subject"
                  className={fieldClassName}
                  maxLength={255}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">Message</span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Write your message"
                  className={`${fieldClassName} min-h-52 resize-y`}
                />
              </label>
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-4">
          <div className="rounded-3xl border border-border/80 bg-card/95 p-5">
            <p className="text-sm font-medium text-foreground">Current selection</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {selectedCourse ? formatSubjectName(selectedCourse.name) : "No subject selected"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedCourse?.course_code ?? "Choose a subject to target the message."}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              {selectedRecipientIds.length === 0
                ? "No recipients selected yet."
                : `${selectedRecipientIds.length} recipient${selectedRecipientIds.length === 1 ? "" : "s"} selected`}
            </p>
          </div>

          <div className="rounded-3xl border border-border/80 bg-card/95 p-5">
            <p className="text-sm font-medium text-foreground">Before you send</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Use a clear title so the conversation is easy to find later.</li>
              <li>Keep course-wide messages short and specific.</li>
              <li>Reply inside the thread later to keep context together.</li>
            </ul>
          </div>

          {error && (
            <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSend || isPending}
            className="w-full sm:hidden"
          >
            {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
            <span>{isPending ? "Sending..." : "Send message"}</span>
          </Button>
        </aside>
      </div>
    </div>
  );
}
