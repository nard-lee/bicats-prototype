import { useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { readErrorMessage } from "@/lib/api-error";
import { Scale, UserRound } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useT } from "@/lib/I18n";
import type { ComplaintDetail } from "./loader";

type RosterMember = {
  id: number;
  fullName: string;
  contact: string | null;
  isActive: boolean;
};

// Mounted only while the dialog is open, so each opening starts from the
// panel currently saved on the case.
function PangkatPanelEditor({
  complaint,
  onSaved,
  onCancel,
}: {
  complaint: ComplaintDetail;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  const [roster, setRoster] = useState<RosterMember[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selected, setSelected] = useState<number[]>(() =>
    complaint.pangkatMembers.map((member) => member.id),
  );
  const [chairmanId, setChairmanId] = useState<number | null>(
    () => complaint.pangkatMembers.find((member) => member.isChairman)?.id ?? null,
  );
  const [isSaving, setIsSaving] = useState(false);

  const active = (roster ?? []).filter((member) => member.isActive);
  // A recorded panel must stay editable after a member leaves the active
  // roster, so those rows are listed too and can only be ticked off.
  const former = complaint.pangkatMembers
    .filter((member) => !active.some((item) => item.id === member.id))
    .map((member) => ({
      id: member.id,
      fullName: member.fullName,
      contact: null,
      isActive: false,
    }));
  const candidates = [...active, ...former];

  useEffect(() => {
    let cancelled = false;

    api
      .get("/lupon-members")
      .json<{ items: RosterMember[] }>()
      .then((result) => {
        if (!cancelled) setRoster(result.items);
      })
      .catch(() => {
        if (!cancelled) {
          setRoster([]);
          setLoadFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(member: RosterMember) {
    if (selected.includes(member.id)) {
      const next = selected.filter((id) => id !== member.id);
      setSelected(next);
      if (chairmanId === member.id) setChairmanId(next[0] ?? null);
      return;
    }

    if (selected.length >= 3 || !member.isActive) return;
    setSelected([...selected, member.id]);
    if (chairmanId === null) setChairmanId(member.id);
  }

  const canSave =
    selected.length === 3 && chairmanId !== null && selected.includes(chairmanId);

  async function handleSave() {
    if (!canSave) return;

    setIsSaving(true);
    try {
      await api
        .patch(`/complaints/${complaint.id}/pangkat`, {
          json: { memberIds: selected, chairmanId },
        })
        .json();

      onSaved();
    } catch (error) {
      toast.error(readErrorMessage(error, t("pangkatPanelSaveFailed")));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="space-y-4 py-2">
        {roster === null ? (
          <p className="text-sm text-muted-foreground">{t("pangkatLoading")}</p>
        ) : candidates.length < 3 ? (
          <div className="space-y-3 rounded-md border border-dashed p-4 text-sm">
            <p className="font-medium">{t("pangkatNeedRoster")}</p>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to="/admin/settings#lupon">{t("pangkatOpenSettings")}</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>{t("pangkatPanelLabel")}</Label>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
              {candidates.map((member) => {
                const checked = selected.includes(member.id);
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <Checkbox
                      id={`pangkat-member-${member.id}`}
                      checked={checked}
                      onCheckedChange={() => toggle(member)}
                    />
                    <Label
                      htmlFor={`pangkat-member-${member.id}`}
                      className="flex flex-1 cursor-pointer items-center justify-between gap-3 font-normal"
                    >
                      <span className={member.isActive ? "" : "text-muted-foreground"}>
                        {member.fullName}
                      </span>
                      <span className="flex items-center gap-2">
                        {chairmanId === member.id && (
                          <Badge variant="secondary">
                            {t("pangkatChairmanBadge")}
                          </Badge>
                        )}
                        {!member.isActive && (
                          <Badge variant="outline">{t("luponInactive")}</Badge>
                        )}
                      </span>
                    </Label>
                  </div>
                );
              })}
            </div>
            {active.length < 3 && (
              <p className="text-sm text-muted-foreground">
                {t("pangkatNeedRoster")}{" "}
                <Link
                  to="/admin/settings#lupon"
                  className="underline underline-offset-3"
                >
                  {t("pangkatOpenSettings")}
                </Link>
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {selected.length === 3
                ? t("pangkatPanelReady")
                : t("pangkatPickThree")}
            </p>
          </div>
        )}

        {selected.length === 3 && (
          <div className="grid gap-2">
            <Label htmlFor="pangkatChairman">{t("pangkatChairmanLabel")}</Label>
            <Select
              value={chairmanId ? String(chairmanId) : undefined}
              onValueChange={(value) => setChairmanId(Number(value))}
            >
              <SelectTrigger id="pangkatChairman">
                <SelectValue placeholder={t("pangkatChairmanPick")} />
              </SelectTrigger>
              <SelectContent>
                {selected.map((memberId) => {
                  const member = candidates.find((item) => item.id === memberId);
                  return (
                    <SelectItem key={memberId} value={String(memberId)}>
                      {member?.fullName ?? String(memberId)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        {loadFailed && (
          <p className="text-sm text-destructive">{t("pangkatRosterFailed")}</p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("pangkatCancel")}
        </Button>
        <Button type="button" onClick={handleSave} disabled={isSaving || !canSave}>
          {isSaving ? t("pangkatSaving") : t("pangkatSavePanel")}
        </Button>
      </DialogFooter>
    </>
  );
}

function PangkatModal({
  complaint,
  onSuccess,
}: {
  complaint: ComplaintDetail;
  onSuccess: () => void;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const hasPanel =
    complaint.pangkatMembers.length > 0 || !!complaint.pangkatChairman;

  function handleSaved() {
    setOpen(false);
    toast.success(t("pangkatPanelSaved"));
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Scale className="mr-2 h-4 w-4" />
          {hasPanel ? t("pangkatEditPanel") : t("pangkatRecordPanel")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("pangkatModalTitle")}</DialogTitle>
          <DialogDescription>{t("pangkatPanelHint")}</DialogDescription>
        </DialogHeader>

        <PangkatPanelEditor
          complaint={complaint}
          onSaved={handleSaved}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export default function PangkatCard({
  complaint,
  canWrite,
  onSuccess,
}: {
  complaint: ComplaintDetail;
  canWrite: boolean;
  onSuccess: () => void;
}) {
  const { t } = useT();
  const panel = complaint.pangkatMembers;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{t("pangkatTitle")}</CardTitle>
            <CardDescription>{t("pangkatDesc")}</CardDescription>
          </div>
          {canWrite && complaint.status === "conciliation" && (
            <PangkatModal complaint={complaint} onSuccess={onSuccess} />
          )}
        </div>
      </CardHeader>

      <CardContent>
        {panel.length > 0 ? (
          <ul className="space-y-2">
            {panel.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  <span className={member.isChairman ? "font-medium" : ""}>
                    {member.fullName}
                  </span>
                </span>
                {member.isChairman && (
                  <Badge variant="secondary">{t("pangkatChairmanBadge")}</Badge>
                )}
              </li>
            ))}
          </ul>
        ) : complaint.pangkatChairman ? (
          <div className="space-y-1">
            <p className="text-sm font-medium">{complaint.pangkatChairman}</p>
            <p className="text-sm text-muted-foreground">
              {t("pangkatChairmanLabel")}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("pangkatEmpty")}</p>
        )}
      </CardContent>
    </Card>
  );
}
