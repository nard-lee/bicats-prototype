import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useT } from "@/lib/I18n";

type Notification = {
  id: number;
  type: string;
  title: string;
  body: string;
  complaintId: number | null;
  reference: string | null;
  readAt: string | null;
  createdAt: string;
};

type Payload = { items: Notification[]; unread: number };

const dotColor = (type: string) => {
  if (type === "overdue" || type === "escalation") return "bg-destructive";
  if (type === "hearing_overdue") return "bg-amber-500";
  if (type === "reminder") return "bg-amber-500";
  if (type === "new_complaint") return "bg-blue-500";
  return "bg-muted-foreground";
};

export default function NotificationsBell() {
  const { t, lang } = useT();
  const { pathname } = useLocation();
  const [data, setData] = useState<Payload>({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.get("notifications").json<Payload>());
    } catch {
      /* not signed in / offline, keep last state */
    }
  }, []);

  useEffect(() => {
    // Async fetch: state is set after the request resolves.
    // oxlint-disable-next-line react/set-state-in-effect
    void load();
    const id = setInterval(() => void load(), 60_000);
    return () => clearInterval(id);
  }, [load]);

  // Real-time: the server pushes a tick whenever we get a new notification.
  // EventSource reconnects on its own if the connection drops.
  useEffect(() => {
    const source = new EventSource("/api/notifications/stream", {
      withCredentials: true,
    });
    source.onmessage = () => void load();
    return () => source.close();
  }, [load]);

  // Re-sync after navigating (e.g. opening a case marks its alerts read).
  useEffect(() => {
    // Async fetch: state is set after the request resolves.
    // oxlint-disable-next-line react/set-state-in-effect
    void load();
  }, [pathname, load]);

  const markAllRead = async () => {
    const now = new Date().toISOString();
    setData((d) => ({
      items: d.items.map((n) => ({ ...n, readAt: n.readAt ?? now })),
      unread: 0,
    }));
    try {
      await api.post("notifications/read-all");
    } catch {
      /* ignore */
    }
  };

  const markRead = async (id: number) => {
    const target = data.items.find((n) => n.id === id);
    if (target?.readAt) return;

    setData((d) => ({
      items: d.items.map((n) =>
        n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n,
      ),
      unread: Math.max(0, d.unread - 1),
    }));

    try {
      await api.patch(`notifications/${id}/read`);
    } catch {
      /* ignore */
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(lang === "tl" ? "fil-PH" : "en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("notifications")}
        className="relative"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) void load();
        }}
      >
        <Bell className="h-4 w-4" />
        {data.unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white">
            {data.unread > 20 ? "20+" : data.unread}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-sm font-medium">{t("notifications")}</span>
              {data.unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  {t("markAllRead")}
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {data.items.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {t("noNotifications")}
                </p>
              ) : (
                data.items.map((n) => {
                  const row = (
                    <div
                      className={`flex gap-3 px-3 py-3 ${n.readAt ? "" : "bg-muted/40"}`}
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColor(n.type)}`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground">{n.body}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {fmt(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  );

                  return n.complaintId ? (
                    <Link
                      key={n.id}
                      to={`/admin/complaints/${n.complaintId}`}
                      onClick={() => {
                        void markRead(n.id);
                        setOpen(false);
                      }}
                      className="block border-b transition-colors last:border-b-0 hover:bg-muted/50"
                    >
                      {row}
                    </Link>
                  ) : (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => void markRead(n.id)}
                      className="block w-full border-b text-left transition-colors last:border-b-0 hover:bg-muted/50"
                    >
                      {row}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
