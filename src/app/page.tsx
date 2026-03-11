import Link from "next/link";
import {
  BookOpen,
  Briefcase,
  Calculator,
  Code2,
  FlaskConical,
  Globe,
  Landmark,
  PenSquare,
  Sigma,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDashboardData } from "@/lib/canvas";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDueDate(value?: string) {
  if (!value) {
    return "No due date";
  }

  return new Date(value).toLocaleString();
}

function getCourseIcon(courseName: string) {
  const normalized = courseName.toLowerCase();

  if (normalized.includes("cálculo") || normalized.includes("calculo") || normalized.includes("mat")) {
    return Calculator;
  }

  if (normalized.includes("física") || normalized.includes("fisica") || normalized.includes("química") || normalized.includes("quimica")) {
    return FlaskConical;
  }

  if (normalized.includes("algorit") || normalized.includes("program") || normalized.includes("software") || normalized.includes("comput")) {
    return Code2;
  }

  if (normalized.includes("hist") || normalized.includes("direito") || normalized.includes("pol") || normalized.includes("soc")) {
    return Landmark;
  }

  if (normalized.includes("ingl") || normalized.includes("idioma") || normalized.includes("comun") || normalized.includes("texto")) {
    return PenSquare;
  }

  if (normalized.includes("gest") || normalized.includes("adm") || normalized.includes("econom") || normalized.includes("negó") || normalized.includes("nego")) {
    return Briefcase;
  }

  if (normalized.includes("estat") || normalized.includes("álgebra") || normalized.includes("algebra")) {
    return Sigma;
  }

  if (normalized.includes("geog") || normalized.includes("global") || normalized.includes("internac")) {
    return Globe;
  }

  return BookOpen;
}

export default async function Home() {
  const result = await getDashboardData()
    .then((data) => ({ data, error: null }))
    .catch((error: unknown) => ({
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    }));

  if (result.error || !result.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6">
        <Card className="w-full max-w-xl border-black/30">
          <CardHeader>
            <CardTitle>Canvas connection failed</CardTitle>
            <CardDescription>
              Set <code>CANVAS_KEY</code> (or <code>CANVAS_API_KEY</code>) then reload.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-black/70">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data } = result;

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto grid min-h-screen max-w-7xl md:grid-cols-[220px_1fr]">
        <aside className="border-r border-black/20 p-4">
          <h1 className="mb-6 text-xl font-bold">Canvas</h1>
          <nav className="space-y-2 text-sm">
            <div className="rounded-md bg-black px-3 py-2 text-white">Dashboard</div>
            <div className="rounded-md border border-black/20 px-3 py-2">Courses</div>
            <div className="rounded-md border border-black/20 px-3 py-2">Calendar</div>
            <div className="rounded-md border border-black/20 px-3 py-2">Inbox</div>
          </nav>
        </aside>

        <main className="p-6">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-black/20 pb-4">
            <div>
              <p className="text-sm text-black/60">Connected to</p>
              <p className="font-medium">{data.apiBase}</p>
            </div>
            <div className="flex items-center gap-3">
              <Avatar className="border border-black/30">
                <AvatarImage src={data.profile.avatar_url} alt={data.profile.name} />
                <AvatarFallback>{getInitials(data.profile.name)}</AvatarFallback>
              </Avatar>
              <div className="text-right">
                <p className="font-semibold">{data.profile.name}</p>
                <p className="text-xs text-black/60">{data.profile.primary_email}</p>
              </div>
            </div>
          </header>

          <section className="mb-6 grid gap-4 sm:grid-cols-3">
            <Card className="border-black/20">
              <CardHeader className="pb-2">
                <CardDescription>Active courses</CardDescription>
                <CardTitle>{data.courses.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-black/20">
              <CardHeader className="pb-2">
                <CardDescription>Upcoming to-do</CardDescription>
                <CardTitle>{data.todo.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-black/20">
              <CardHeader className="pb-2">
                <CardDescription>Dashboard cards</CardDescription>
                <CardTitle>{data.dashboardCards.length}</CardTitle>
              </CardHeader>
            </Card>
          </section>

          <section className="mb-6">
            <h2 className="mb-3 text-lg font-semibold">Subjects</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.courses.map((course) => {
                const Icon = getCourseIcon(course.name);

                return (
                  <Card key={course.id} className="border-black/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <span className="rounded-md border border-black/30 p-1.5">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="line-clamp-1">{course.name}</span>
                      </CardTitle>
                      <CardDescription>{course.course_code ?? "No code"}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Badge variant="outline" className="mb-3 border-black/40 text-black">
                        {course.workflow_state ?? "active"}
                      </Badge>
                      <Link
                        href={course.html_url ?? "#"}
                        target="_blank"
                        className="block text-sm font-medium underline"
                      >
                        Open subject
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="border-black/20">
              <CardHeader>
                <CardTitle>Dashboard Cards</CardTitle>
                <CardDescription>Quick access links from Canvas</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.dashboardCards.map((card) => (
                      <TableRow key={card.id}>
                        <TableCell>
                          <p className="font-medium">{card.shortName}</p>
                          <p className="text-xs text-black/60">{card.originalName}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={card.href ?? "#"} target="_blank" className="text-sm underline">
                            Open in Canvas
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-black/20">
              <CardHeader>
                <CardTitle>To-Do</CardTitle>
                <CardDescription>Upcoming activities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.todo.length === 0 && (
                  <p className="text-sm text-black/70">No pending activities right now.</p>
                )}
                {data.todo.map((item) => (
                  <div key={`${item.type}-${item.assignment?.id}`} className="rounded-md border border-black/20 p-3">
                    <p className="text-sm font-medium">{item.assignment?.name ?? "Untitled task"}</p>
                    <p className="text-xs text-black/70">{item.context_name ?? "Unknown course"}</p>
                    <p className="mt-1 text-xs">Due: {formatDueDate(item.assignment?.due_at)}</p>
                    {item.assignment?.html_url && (
                      <Link
                        href={item.assignment.html_url}
                        target="_blank"
                        className="mt-2 inline-block text-xs font-medium underline"
                      >
                        Open activity
                      </Link>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
