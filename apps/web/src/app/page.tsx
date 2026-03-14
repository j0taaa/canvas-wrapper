import { cookies } from "next/headers";
import HomeClient from "./home-client";
import { CanvasDashboardData, getDashboardData } from "@/lib/canvas";
import { parseSubjectPreferences, SUBJECT_PREFERENCES_COOKIE } from "@/lib/subject-preferences";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

export default async function Home() {
  const cookieStore = await cookies();
  const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;
  const initialPreferences = parseSubjectPreferences(
    cookieStore.get(SUBJECT_PREFERENCES_COOKIE)?.value,
  );
  let initialData: CanvasDashboardData | null = null;

  if (apiKey) {
    try {
      initialData = await getDashboardData(apiKey);
    } catch {
      initialData = null;
    }
  }

  return <HomeClient initialData={initialData} initialPreferences={initialPreferences} />;
}
