// The three Pangkat seats plus the chair elected from among them.
// `chairmanId` stays null until someone is picked: the chair is always an
// explicit choice, never a default.
export type PangkatChoice = {
  memberIds: number[];
  chairmanId: number | null;
};

export function isPangkatComplete(choice: PangkatChoice): boolean {
  return (
    choice.memberIds.length === 3 &&
    choice.chairmanId !== null &&
    choice.memberIds.includes(choice.chairmanId)
  );
}

export function choiceFromPanel(
  panel: { id: number; isChairman: boolean }[],
): PangkatChoice {
  return {
    memberIds: panel.map((member) => member.id),
    chairmanId: panel.find((member) => member.isChairman)?.id ?? null,
  };
}
