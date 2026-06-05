type IconProps = {
  name: "home" | "shirt" | "sparkles" | "video" | "inbox" | "badge" | "users" | "package" | "image";
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
};

export default function NavIcon({ name }: IconProps) {
  return (
    <svg className="nav-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  );
}
