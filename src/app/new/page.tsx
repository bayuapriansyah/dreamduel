import { Suspense } from "react";
import { CreateDuel } from "@/components/CreateDuel";

export const metadata = { title: "New duel | DreamDuel" };

export default function Page() {
  return (
    <Suspense>
      <CreateDuel />
    </Suspense>
  );
}
