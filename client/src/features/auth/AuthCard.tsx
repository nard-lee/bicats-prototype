import type { ReactNode } from "react";
import { Link } from "react-router";
import { useT } from "@/lib/I18n";

export default function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { t } = useT();

  return (
    <div className="mx-auto w-full max-w-md px-6 py-16">
      <p className="font-heading text-xs font-semibold uppercase tracking-[0.28em] text-primary dark:text-status-ink">
        {subtitle}
      </p>
      <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-tight">
        {title}
      </h1>

      <div className="mt-8 space-y-5">{children}</div>

      <Link
        to="/"
        className="mt-8 block text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        {t("backPublic")}
      </Link>
    </div>
  );
}
