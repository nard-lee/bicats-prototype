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
import { cn } from "cn";
import { api } from "@/lib/api";
import { useT } from "@/lib/I18n";
import {
  choiceFromPanel,
  isPangkatComplete,
  type PangkatChoice,
} from "@/lib/pangkat";
import type { ComplaintDetail } from "./loader";

type RosterMember = {
  id: number;
  fullName: string;
  contact: string | null;
  isActive: boolean;
};

// The roster list and the chairman election, shared by the Pangkat screen and
// the step that moves a case into conciliation or arbitration. `seed` is the
// panel already recorded on the case: its members stay listed even after they
// leave the active roster, so a recorded panel never disappears.
export function PangkatPicker({
  initial,
  seed = [],
  onChange,
}: {
  initial: PangkatChoice;
  seed?: { id: number; fullName: string }[];
  onChange: (choice: PangkatChoice) => void;
}) {
  const { t } = useT();
  const [roster, setRoster] = useState<RosterMember[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number[]>(initial.memberIds);
  const [chairmanId, setChairmanId] = useState<number | null>(initial.chairmanId);
  const [swapNotice, setSwapNotice] = useState(false);

  const active = (roster ?? []).filter((member) => member.isActive);
  const former = seed
    .filter((member) => !active.some((item) => item.id === member.id))
    .map((member) => ({
      id: member.id,
      fullName: member.fullName,
      contact: null,
      isActive: false,
    }));
  const candidates = [...active, ...former];
  const nameOf = (memberId: number) =>
    candidates.find((member) => member.id === memberId)?.fullName ??
    String(memberId);

  const needle = query.trim().toLowerCase();
  const shown = needle
    ? candidates.filter((member) => member.fullName.toLowerCase().includes(needle))
    : candidates;

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

  function commit(next: number[], chair: number | null) {
    setSelected(next);
    setChairmanId(chair);
    setSwapNotice(false);
    onChange({ memberIds: next, chairmanId: chair });
  }

  function toggle(member: RosterMember) {
    if (selected.includes(member.id)) {
      // Unticking the chair clears the election rather than promoting whoever
      // happens to sit first in the list.
      commit(
        selected.filter((id) => id !== member.id),
        chairmanId === member.id ? null : chairmanId,
      );
      return;
    }

    if (!member.isActive) return;
    // A fourth pick is answered in words, never by silently dropping a seat.
    if (selected.length >= 3) {
      setSwapNotice(true);
      return;
    }
    commit([...selected, member.id], chairmanId);
  }

  return (
    <div className="space-y-4">
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
          <div className="flex items-baseline justify-between gap-3">
            <Label>{t("pangkatPanelLabel")}</Label>
            <span className="text-sm tabular-nums text-muted-foreground">
              {selected.length} {t("pangkatOfThree")}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {swapNotice
              ? t("pangkatSwapHint")
              : selected.length < 3
                ? t("pangkatPickThree")
                : chairmanId === null
                  ? t("pangkatPanelReady")
                  : t("pangkatPanelSet")}
          </p>
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
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            // The picker sits inside the advance form, where Enter would submit
            // the stage change while someone is still typing a name.
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
            placeholder={t("pangkatSearch")}
            aria-label={t("pangkatSearch")}
            className="h-9"
          />
          <div className="flex flex-wrap gap-2">
            {shown.map((member) => {
              const picked = selected.includes(member.id);
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggle(member)}
                  aria-pressed={picked}
                  disabled={!member.isActive && !picked}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    picked
                      ? "border-primary/40 bg-primary/10 font-medium text-primary dark:text-status-ink"
                      : "border-input text-muted-foreground hover:bg-primary/5 hover:text-foreground",
                    !member.isActive && "cursor-not-allowed opacity-60",
                  )}
                >
                  {member.fullName}
                  {chairmanId === member.id && (
                    <span className="ml-2 font-semibold">
                      {t("pangkatChairmanBadge")}
                    </span>
                  )}
                  {!member.isActive && (
                    <span className="ml-2">{t("luponInactive")}</span>
                  )}
                </button>
              );
            })}
            {shown.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t("pangkatNoMatch")}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>{t("pangkatChairmanLabel")}</Label>
        {selected.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("pangkatChairWaiting")}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selected.map((memberId) => {
              const isChair = chairmanId === memberId;
              return (
                <button
                  key={memberId}
                  type="button"
                  onClick={() => commit(selected, memberId)}
                  aria-pressed={isChair}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    isChair
                      ? "border-primary bg-primary font-medium text-primary-foreground"
                      : "border-input text-muted-foreground hover:bg-primary/5 hover:text-foreground",
                  )}
                >
                  {nameOf(memberId)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {loadFailed && <p className="text-sm text-destructive">{t("pangkatRosterFailed")}</p>}
    </div>
  );
}

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
  const [choice, setChoice] = useState<PangkatChoice>(() =>
    choiceFromPanel(complaint.pangkatMembers),
  );
  const [isSaving, setIsSaving] = useState(false);

  const complete = isPangkatComplete(choice);

  async function handleSave() {
    if (!complete) return;

    setIsSaving(true);
    try {
      await api
        .patch(`/complaints/${complaint.id}/pangkat`, {
          json: { memberIds: choice.memberIds, chairmanId: choice.chairmanId },
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
        <PangkatPicker
          initial={choice}
          seed={complaint.pangkatMembers}
          onChange={setChoice}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("pangkatCancel")}
        </Button>
        <Button type="button" onClick={handleSave} disabled={isSaving || !complete}>
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
          {canWrite &&
            (complaint.status === "conciliation" ||
              (complaint.status === "arbitration" &&
                complaint.arbitrationBy !== "punong_barangay")) && (
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
