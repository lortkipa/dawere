// The uploaded photo, or a gray silhouette for users without one.
export function Avatar({ src, className = "size-9" }: { src?: string; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={`shrink-0 rounded-full object-cover ${className}`} />;
  }

  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={`shrink-0 rounded-full ${className}`}>
      <rect width="40" height="40" fill="#e4e6eb" />
      <circle cx="20" cy="15.5" r="7" fill="#bcc0c4" />
      <path d="M5 40c0-8.8 6.7-14 15-14s15 5.2 15 14z" fill="#bcc0c4" />
    </svg>
  );
}
