import { useNavigate } from "react-router";
import { LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { clearCurrentUser } from "@/hooks/use-auth";
import { useT } from "@/lib/I18n";

export function LogoutButton() {
    const navigate = useNavigate();
    const { t } = useT();

    async function handleLogout() {
        try {
            await api.post("auth/log-out");
            clearCurrentUser();
        } finally {
            navigate("/login");
        }
    }

    return (
        <SidebarMenuButton onClick={handleLogout} tooltip={t("logout")}>
            <LogOut />
            <span>{t("logout")}</span>
        </SidebarMenuButton>
    );
}
