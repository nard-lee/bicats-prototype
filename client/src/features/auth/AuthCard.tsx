import type { ReactNode } from "react";
import { Link } from "react-router";
import { useT } from "@/lib/I18n";

export default function AuthCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { t } = useT();

  return (
    <div className="mx-auto w-full max-w-md px-6 py-16">
      <div className="overflow-hidden rounded-md border">
        <div className="flex flex-col items-center gap-2 bg-primary px-6 py-8 text-center text-primary-foreground">
          {icon}
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-xs opacity-80">{subtitle}</p>
        </div>
        <div className="space-y-5 p-6">{children}</div>
      </div>

      <Link
        to="/"
        className="mt-6 block text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        {t("backPublic")}
      </Link>
    </div>
  );
}