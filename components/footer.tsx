import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-8 sm:px-6">
        <Logo />
        <p className="text-sm text-muted">© 2026</p>
      </div>
    </footer>
  );
}
