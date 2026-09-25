import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — Rhythm" },
      { name: "description", content: "Create a Rhythm account and start setup." },
      { property: "og:title", content: "Sign up — Rhythm" },
      { property: "og:description", content: "Create your Rhythm account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AuthForm mode="signup" />,
});
