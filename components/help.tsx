// Shown under every help page when SUPPORT_EMAIL is set.
export function SupportLine() {
  const email = process.env.SUPPORT_EMAIL;
  if (!email) return null;
  return (
    <p className="mx-auto mt-14 max-w-2xl border-t border-line pt-6 text-center text-muted">
      პასუხი ვერ იპოვე? მოგვწერე:{" "}
      <a href={`mailto:${email}`} className="font-medium text-ink underline underline-offset-2">
        {email}
      </a>
    </p>
  );
}
