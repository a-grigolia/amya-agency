import type { Metadata } from "next";
import { AccessGate } from "./password-form";

export const metadata: Metadata = {
  title: "Protected page",
};

export default function AccessPage() {
  return <AccessGate />;
}
