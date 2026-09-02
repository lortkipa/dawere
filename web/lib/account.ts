import type { Session } from "next-auth";

/** The signed-in person, as every top bar needs them. */
export type Account = {
  name: string;
  email: string;
  image: string | null;
};

/**
 * Auth.js leaves every profile field nullable. Filling the gaps once here keeps
 * the same `name ?? email ?? ""` fallback out of three separate pages — and the
 * email is the identity, so it is the one thing always worth falling back to.
 */
export function accountFrom(session: Session): Account {
  const { name, email, image } = session.user;

  return {
    name: name ?? email ?? "",
    email: email ?? "",
    image: image ?? null,
  };
}
