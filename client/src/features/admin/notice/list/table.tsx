import { useEffect, useState } from "react";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { toast } from "sonner";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DataPagination from "@/components/data-pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/lib/I18n";
import type { NoticeItem, Paginated } from "./loader";
import type { NoticeActionResult } from "../types";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm font-medium text-destructive">{message}</p>;
}

export default function NoticesList() {
  const { lang } = useT();
  const { items, total, page, pageSize, totalPages } = useLoaderData() as Paginated<NoticeItem>;
  const actionData = useActionData() as NoticeActionResult | undefined;
  const submitting = useNavigation().state === "submitting";

  const [editing, setEditing] = useState<NoticeItem | null>(null);
  const [deleting, setDeleting] = useState<NoticeItem | null>(null);

  useEffect(() => {
    if (!actionData?.success) return;

    if (actionData.intent === "delete") {
      // Close the dialog only after the router action succeeds.
      // oxlint-disable-next-line react/set-state-in-effect
      setDeleting(null);
      toast.success("Notice deleted.");
    } else if (actionData.intent === "update") {
      // oxlint-disable-next-line react/set-state-in-effect
      setEditing(null);
      toast.success("Notice updated.");
    }
  }, [actionData]);

  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "tl" ? "fil-PH" : "en-PH", {
      dateStyle: "medium",
    });

  const fields = actionData?.fields ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notices</h1>
          <p className="text-sm text-muted-foreground">{total} total</p>
        </div>
        <Button asChild>
          <Link to="/admin/notices/create">
            <Plus className="mr-2 h-4 w-4" /> New Notice
          </Link>
        </Button>
      </div>

      {actionData?.error && !editing && (
        <p className="text-sm font-medium text-destructive">{actionData.error}</p>
      )}

      {items.length === 0 ? (
        <div className="rounded-md border py-16 text-center text-sm text-muted-foreground">
          No notices yet. Create the first one to publish it on the home page.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((notice) => (
            <Card key={notice.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-lg">{notice.title}</CardTitle>
                <Badge variant={notice.isPublished ? "default" : "secondary"}>
                  {notice.isPublished ? "Published" : "Draft"}
                </Badge>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col">
                <p className="mb-4 whitespace-pre-line text-sm text-muted-foreground line-clamp-4">
                  {notice.body}
                </p>

                <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3 text-sm text-muted-foreground">
                  <span className="truncate">
                    {notice.createdBy?.fullName ?? "Admin"} · {date(notice.createdAt)}
                  </span>

                  <div className="flex items-center gap-1">
                    <Form method="post">
                      <input type="hidden" name="intent" value="update" />
                      <input type="hidden" name="id" value={notice.id} />
                      <input type="hidden" name="title" value={notice.title} />
                      <input type="hidden" name="body" value={notice.body} />
                      <input
                        type="hidden"
                        name="isPublished"
                        value={notice.isPublished ? "" : "on"}
                      />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={submitting}
                        title={notice.isPublished ? "Unpublish" : "Publish"}
                      >
                        {notice.isPublished ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </Form>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditing(notice)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleting(notice)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {total > 0 && (
        <DataPagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          className="justify-end"
        />
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          {editing && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Notice</DialogTitle>
                <DialogDescription>
                  Update the notice and choose whether it appears on the home page.
                </DialogDescription>
              </DialogHeader>

              <Form method="post" key={editing.id} className="space-y-4">
                <input type="hidden" name="intent" value="update" />
                <input type="hidden" name="id" value={editing.id} />

                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    name="title"
                    defaultValue={editing.title}
                    aria-invalid={!!fields.title}
                    required
                  />
                  <FieldError message={fields.title} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-body">Content</Label>
                  <Textarea
                    id="edit-body"
                    name="body"
                    rows={6}
                    defaultValue={editing.body}
                    aria-invalid={!!fields.body}
                    required
                  />
                  <FieldError message={fields.body} />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit-published"
                    name="isPublished"
                    defaultChecked={editing.isPublished}
                  />
                  <Label htmlFor="edit-published" className="text-sm font-normal">
                    Published
                  </Label>
                </div>

                {actionData?.error && (
                  <p className="text-sm font-medium text-destructive">
                    {actionData.error}
                  </p>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditing(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Saving..." : "Save changes"}
                  </Button>
                </DialogFooter>
              </Form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          {deleting && (
            <Form method="post">
              <input type="hidden" name="intent" value="delete" />
              <input type="hidden" name="id" value={deleting.id} />

              <DialogHeader>
                <DialogTitle>Delete this notice?</DialogTitle>
                <DialogDescription>
                  "{deleting.title}" will be permanently removed. This cannot be undone.
                </DialogDescription>
              </DialogHeader>

              {actionData?.error && (
                <p className="mt-4 text-sm font-medium text-destructive">
                  {actionData.error}
                </p>
              )}

              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleting(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={submitting}>
                  {submitting ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
