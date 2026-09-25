import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/home" });
  },
  head: () => ({
    meta: [
      { title: "Rhythm — A quiet typing safety companion" },
      { name: "description", content: "Rhythm notices sudden changes in typing timing and checks that you are okay." },
      { property: "og:title", content: "Rhythm — A quiet typing safety companion" },
      { property: "og:description", content: "A calm companion that notices sudden changes in typing timing without reading words." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
