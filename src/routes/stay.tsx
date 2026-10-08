import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/stay")({
  head: () => ({
    meta: [
      { title: "My stay — Soujanya Stays" },
      { name: "description", content: "Order food to your room, book spa and activities, and request housekeeping." },
      { property: "og:title", content: "My stay — Soujanya Stays" },
      { property: "og:description", content: "In-room dining, spa, activities and requests during your stay." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Stay,
});

function Stay() { return <Navigate to="/guest" search={{ view: "dining" }} replace />; }
