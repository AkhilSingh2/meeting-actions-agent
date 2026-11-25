import type { Metadata } from "next";
import { Composer } from "@/components/home/Composer";

export const metadata: Metadata = { title: "New meeting" };

export default function HomePage() {
  return <Composer />;
}
