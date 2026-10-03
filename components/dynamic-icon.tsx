"use client";

import { icons, type LucideProps } from "lucide-react";

type DynamicIconProps = LucideProps & {
  name: string;
};

export default function DynamicIcon({ name, ...props }: DynamicIconProps) {
  const pascalName = name
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("") as keyof typeof icons;

  const IconComponent = icons[pascalName] ?? icons[name as keyof typeof icons];
  if (!IconComponent) return null;
  return <IconComponent {...props} />;
}
