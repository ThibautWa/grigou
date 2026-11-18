import Image from 'next/image';
import Link from 'next/link';

/** Grigou logo: the black version on the light theme, the white one on the dark theme. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <Image src="/dark-logo.png" alt="" width={size} height={size} className="object-contain dark:hidden" priority />
      <Image src="/clear-logo.png" alt="" width={size} height={size} className="hidden object-contain dark:block" priority />
    </span>
  );
}

export default function Logo({ href = '/', size = 28, compact = false }: { href?: string; size?: number; compact?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-md" aria-label="Grigou, accueil">
      <LogoMark size={size} />
      <span className={`font-display text-xl font-semibold tracking-tight text-fg ${compact ? 'hidden sm:inline' : ''}`}>Grigou</span>
    </Link>
  );
}
