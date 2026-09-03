import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Editor } from "@/components/editor/Editor";
import { currentAccount } from "@/lib/account";

export const metadata: Metadata = {
  title: "ახალი სტატია · dawere",
};

export default async function NewArticlePage() {
  const account = await currentAccount();

  if (!account) redirect("/");

  // No row yet — the first save is what creates one, and moves the address to
  // /write/<id>.
  return <Editor account={account} />;
}
