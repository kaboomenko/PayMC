import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Создать магазин" };

export default function SignupPage() {
  return <SignupForm />;
}
