import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Editor } from "@/components/editor/Editor";
import { accountFrom } from "@/lib/account";

export const metadata: Metadata = {
  title: "ახალი სტატია · dawere",
};

export default async function NewArticlePage() {
  const session = await auth();

  if (!session?.user) redirect("/");

  // No row yet — the first save is what creates one, and moves the address to
  // /write/<id>.
  return <Editor account={accountFrom(session)} />;
}
