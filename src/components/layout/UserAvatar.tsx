import { Avatar } from "@heroui/react";

export function initials(name: string, email: string) {
  const source = name.trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function UserAvatar({
  name,
  email,
  src,
  size = "sm",
}: {
  name: string;
  email: string;
  src: string | null;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <Avatar size={size}>
      {src && <Avatar.Image src={src} alt={name || email} referrerPolicy="no-referrer" />}
      <Avatar.Fallback>{initials(name, email)}</Avatar.Fallback>
    </Avatar>
  );
}
