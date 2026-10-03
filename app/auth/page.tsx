import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { Glow } from "@/components/glow";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "შესვლა — dawere",
};

export default function AuthPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header bare />
      <main className="relative flex-1 px-4 pt-[12vh] pb-16 sm:px-6 sm:pt-[18vh]">
        <Glow />
        <div className="animate-rise mx-auto w-full max-w-sm">
          <AuthForm />
        </div>
      </main>
    </div>
  );
}
