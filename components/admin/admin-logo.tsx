import Image from "next/image";

/**
 * The real ABLux logo for the admin (same pair as the site navigation): the
 * paper version in Papir, the ink version in Tinta. CSS shows one of them; the
 * hidden one is display:none, so screen readers announce the name once.
 */
export function AdminLogo({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <span className={className ? `adm-logo ${className}` : "adm-logo"}>
      <Image src="/logo-light.avif" alt="ABLux Travel" width={2112} height={2048} sizes="64px" className="adm-logo__img adm-logo__img--paper" priority={priority} />
      <Image src="/logo-dark.avif" alt="ABLux Travel" width={2110} height={2048} sizes="64px" className="adm-logo__img adm-logo__img--ink" priority={priority} />
    </span>
  );
}
