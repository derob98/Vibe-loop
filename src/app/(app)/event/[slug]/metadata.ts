import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: event } = await supabase
    .from("events")
    .select("title, description, cover_image_url")
    .eq("slug", slug)
    .single();

  if (!event) {
    return {
      title: "Evento non trovato | VibeLoop",
    };
  }

  return {
    title: `${event.title} | VibeLoop`,
    description: event.description ?? "Scopri questo evento su VibeLoop",
    openGraph: {
      title: event.title,
      description: event.description ?? "Scopri questo evento su VibeLoop",
      images: event.cover_image_url ? [event.cover_image_url] : [],
      type: "website",
    },
  };
}