type IconProps = {
  name:
    | "home"
    | "shirt"
    | "sparkles"
    | "video"
    | "inbox"
    | "badge"
    | "users"
    | "package"
    | "image"
    | "file"
    | "book"
    | "play"
    | "check"
    | "clock"
    | "refresh"
    | "download"
    | "plus"
    | "user"
    | "building";
  className?: string;
};

const paths: Record<IconProps["name"], React.ReactNode> = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </>
  ),
  shirt: (
    <>
      <path d="M8 4 5 6.5 3 11l4 2v8h10v-8l4-2-2-4.5L16 4" />
      <path d="M8 4c.8 1.8 2.1 2.7 4 2.7S15.2 5.8 16 4" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3 13.8 8.2 19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="M5 15 6 18l3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" />
      <path d="M19 16l.7 2.1L22 19l-2.3.9L19 22l-.7-2.1L16 19l2.3-.9L19 16Z" />
    </>
  ),
  video: (
    <>
      <rect x="4" y="5" width="11" height="14" rx="2" />
      <path d="m15 10 5-3v10l-5-3" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 4h16l2 10v6H2v-6L4 4Z" />
      <path d="M2 14h6l2 3h4l2-3h6" />
    </>
  ),
  badge: (
    <>
      <path d="M12 3 5 6v6c0 4.2 2.7 7 7 9 4.3-2 7-4.8 7-9V6l-7-3Z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16.5 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  package: (
    <>
      <path d="m3 7 9-4 9 4-9 4-9-4Z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="m21 15-4.5-4.5L8 19" />
    </>
  ),
  file: (
    <>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" />
      <path d="M14 3v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
      <path d="M4 19a2.5 2.5 0 0 1 2.5-2.5H20" />
      <path d="M8 7h8" />
      <path d="M8 11h6" />
    </>
  ),
  play: <path d="M8 5.5v13l11-6.5L8 5.5Z" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11A8 8 0 1 0 19 16" />
      <path d="M20 5v6h-6" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11" />
      <path d="m7.5 11 4.5 4 4.5-4" />
      <path d="M5 20h14" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  building: (
    <>
      <rect x="5.5" y="3.5" width="13" height="17" rx="1.5" />
      <path d="M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2.5" />
    </>
  ),
};

export default function NavIcon({ name, className }: IconProps) {
  return (
    <svg className={className ?? "nav-svg"} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  );
}
