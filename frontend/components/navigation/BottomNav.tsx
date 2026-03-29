"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Fingerprint, ScanLine, Shirt, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/",       label: "홈",   Icon: Sparkles    },
  { href: "/mirror", label: "미러", Icon: ScanLine    },
  { href: "/closet", label: "옷장", Icon: Shirt       },
  { href: "/tpo",    label: "TPO",  Icon: Compass     },
  { href: "/dna",    label: "DNA",  Icon: Fingerprint },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex-shrink-0 bg-ivory"
      style={{ boxShadow: "var(--shadow-nav)" }}
      aria-label="메인 내비게이션"
    >
      {/* Safe-area spacer for iOS home indicator */}
      <ul className="flex h-[72px] items-stretch">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                className="relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors"
                aria-current={isActive ? "page" : undefined}
              >
                {/* Gold top indicator bar */}
                {isActive && <span className="nav-indicator" />}

                {/* Icon */}
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2 : 1.5}
                  className={
                    isActive
                      ? "text-gold"
                      : "text-charcoal/40"
                  }
                />

                {/* Label */}
                <span
                  className={[
                    "text-[10px] font-medium leading-none tracking-wide",
                    isActive ? "text-gold" : "text-charcoal/40",
                  ].join(" ")}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* iOS safe area bottom inset */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
