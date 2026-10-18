import { useNavigate } from "react-router";
import { api } from "@/lib/api";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { clearCurrentUser } from "@/hooks/use-auth";

export function LogoutButton() {
    const navigate = useNavigate();
    async function handleLogout() {
        try {
            await api.post("auth/log-out");
            clearCurrentUser();
        } finally {
            navigate("/login");
        }
    }

    return <SidebarMenuButton onClick={handleLogout}>Log out</SidebarMenuButton>;
}