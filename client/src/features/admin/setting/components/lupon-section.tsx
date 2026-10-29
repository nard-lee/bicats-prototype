import { useEffect, useState } from "react";
import { toast } from "sonner";
import { readErrorMessage } from "@/lib/api-error";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useT } from "@/lib/I18n";

type Member = {
  id: number;
  fullName: string;
  contact: string | null;
  isActive: boolean;
};

function sortMembers(members: Member[]): Member[] {
  return [...members].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return a.fullName.localeCompare(b.fullName);
  });
}

// Mounted only while the dialog is open, so the form always starts from the
// member it was opened for.
function MemberForm({
  member,
  onSaved,
  onCancel,
}: {
  member: Member | null;
  onSaved: (member: Member) => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  const [fullName, setFullName] = useState(member?.fullName ?? "");
  const [contact, setContact] = useState(member?.contact ?? "");
  const [isActive, setIsActive] = useState(member?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  const canSave = fullName.trim().length >= 2;

  async function handleSave() {
    if (!canSave) return;

    setSaving(true);
    try {
      const saved = member
        ? await api
            .patch(`/lupon-members/${member.id}`, {
              json: {
                fullName: fullName.trim(),
                contact: contact.trim() || null,
                isActive,
              },
            })
            .json<Member>()
        : await api
            .post("/lupon-members", {
              json: {
                fullName: fullName.trim(),
                contact: contact.trim() || null,
              },
            })
            .json<Member>();

      toast.success(member ? t("luponSaved") : t("luponAdded"));
      onSaved(saved);
    } catch (error) {
      toast.error(readErrorMessage(error, t("luponSaveFailed")));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="grid gap-4 py-2">
        <div className="grid gap-2">
          <Label htmlFor="luponFullName">{t("luponNameLabel")}</Label>
          <Input
            id="luponFullName"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            maxLength={120}
            placeholder={t("luponNamePlaceholder")}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="luponContact">{t("luponContactLabel")}</Label>
          <Input
            id="luponContact"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            maxLength={40}
            placeholder="0917 000 0000"
          />
        </div>
        {member && (
          <div className="flex items-center gap-3 text-sm">
            <Checkbox
              id="luponActive"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked === true)}
            />
            <Label htmlFor="luponActive" className="cursor-pointer font-normal">
              {t("luponActiveLabel")}
            </Label>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("luponCancel")}
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving || !canSave}>
          {saving ? t("luponSaving") : t("luponSave")}
        </Button>
      </DialogFooter>
    </>
  );
}

function MemberDialog({
  member,
  onSaved,
}: {
  member: Member | null;
  onSaved: (member: Member) => void;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {member ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("luponEdit")}
          >
            <Pencil />
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm">
            {t("luponAdd")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            {member ? t("luponModalEditTitle") : t("luponModalAddTitle")}
          </DialogTitle>
          <DialogDescription>{t("luponModalDesc")}</DialogDescription>
        </DialogHeader>

        <MemberForm
          member={member}
          onSaved={(saved) => {
            setOpen(false);
            onSaved(saved);
          }}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export default function LuponSection({ canEdit }: { canEdit: boolean }) {
  const { t } = useT();
  const [members, setMembers] = useState<Member[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/lupon-members")
      .json<{ items: Member[] }>()
      .then((result) => {
        if (!cancelled) setMembers(result.items);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function upsert(saved: Member) {
    setMembers((current) => {
      const list = current ?? [];
      const exists = list.some((member) => member.id === saved.id);
      return sortMembers(
        exists
          ? list.map((member) => (member.id === saved.id ? saved : member))
          : [...list, saved],
      );
    });
  }

  async function remove(member: Member) {
    if (!window.confirm(t("luponRemoveConfirm"))) return;

    try {
      await api.delete(`/lupon-members/${member.id}`);
      setMembers((current) =>
        (current ?? []).filter((item) => item.id !== member.id),
      );
      toast.success(t("luponRemoved"));
    } catch (error) {
      toast.error(readErrorMessage(error, t("luponRemoveFailed")));
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>
              {t("luponSectionTitle")}
            </CardTitle>
            <CardDescription>{t("luponSectionDesc")}</CardDescription>
          </div>
          {canEdit && <MemberDialog member={null} onSaved={upsert} />}
        </div>
      </CardHeader>

      <CardContent>
        {members === null ? (
          <p className="text-sm text-muted-foreground">{t("luponLoading")}</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("luponEmpty")}</p>
        ) : (
          <ul className="divide-y">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p
                    className={
                      member.isActive
                        ? "truncate text-sm font-medium"
                        : "truncate text-sm font-medium text-muted-foreground line-through"
                    }
                  >
                    {member.fullName}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {member.contact || t("luponNoContact")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!member.isActive && (
                    <Badge variant="outline">{t("luponInactive")}</Badge>
                  )}
                  {canEdit && (
                    <>
                      <MemberDialog member={member} onSaved={upsert} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("luponRemove")}
                        onClick={() => remove(member)}
                      >
                        <Trash2 />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          {canEdit ? t("luponInstantHint") : t("luponAdminOnly")}
        </p>
      </CardContent>
    </Card>
  );
}
