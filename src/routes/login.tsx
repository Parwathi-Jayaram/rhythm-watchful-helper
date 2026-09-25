import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — Rhythm" },
      { name: "description", content: "Log in to Rhythm to manage your emergency contacts." },
      { property: "og:title", content: "Log in — Rhythm" },
      { property: "og:description", content: "Log in to your Rhythm account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AuthForm mode="login" />,
});
