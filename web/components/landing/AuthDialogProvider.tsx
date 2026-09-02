"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Button } from "@/components/ui/Button";
import { AuthDialog } from "./AuthDialog";

const AuthDialogContext = createContext<(() => void) | null>(null);

/** Owns the auth dialog so any trigger on the page can open the same one. */
export function AuthDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const openDialog = useCallback(() => setOpen(true), []);
  const closeDialog = useCallback(() => setOpen(false), []);

  return (
    <AuthDialogContext.Provider value={openDialog}>
      {children}
      <AuthDialog open={open} onClose={closeDialog} />
    </AuthDialogContext.Provider>
  );
}

/** A Button that opens the auth dialog. Takes every Button prop. */
export function AuthTrigger(props: React.ComponentProps<typeof Button>) {
  const openDialog = useContext(AuthDialogContext);

  if (!openDialog) {
    throw new Error(
      "AuthTrigger must be rendered inside an AuthDialogProvider",
    );
  }

  return <Button {...props} onClick={openDialog} />;
}
