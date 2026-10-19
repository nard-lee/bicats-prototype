import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/I18n";

export default function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useT();
  const isDark = resolvedTheme === "dark";
  const label = isDark ? t("themeLight") : t("themeDark");

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <Sun className="hidden dark:block" />
      <Moon className="block dark:hidden" />
    </Button>
  );
}
