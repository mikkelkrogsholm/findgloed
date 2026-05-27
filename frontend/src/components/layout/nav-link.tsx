import { motion } from "motion/react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";
import { navigate } from "@/lib/nav";
import { getMotionMode, hoverLiftVariants, revealVariants } from "@/lib/motion";

type NavLinkProps = {
  href: string;
  label: string;
  active?: boolean;
  variant?: "pill" | "primary";
  external?: boolean;
} & Omit<ComponentProps<typeof motion.a>, "href" | "children">;

export function NavLink({
  href,
  label,
  active = false,
  variant = "pill",
  external = false,
  className,
  ...rest
}: NavLinkProps) {
  const motionMode = getMotionMode();
  const variants = { ...revealVariants(motionMode, "item"), ...hoverLiftVariants(motionMode) };

  const baseClasses =
    variant === "primary"
      ? "glass-pill hover-glow rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider"
      : "glass-pill hover-glow partner-pill rounded-full px-4 py-1 text-xs tracking-wider";

  const activeClasses = active
    ? "ring-1 ring-[color:var(--color-link)] bg-[color:var(--surface-glass-strong)]"
    : "";

  return (
    <motion.a
      href={href}
      className={cn(baseClasses, activeClasses, className)}
      variants={variants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      whileTap="hover"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      onClick={(event) => {
        if (external) return;
        event.preventDefault();
        navigate(href);
      }}
      {...rest}
    >
      {label}
    </motion.a>
  );
}
