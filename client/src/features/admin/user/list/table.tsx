import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from "react-router";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DataPagination from "@/components/data-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useT } from "@/lib/I18n";
import { ROLE_LABEL } from "@/lib/roles";
import type { StaffUser, Paginated } from "./loader";
import type { UsersActionResult } from "./action";

export default function StaffAccounts() {
  const { t, lang } = useT();
  const { items, total, page, pageSize, totalPages } = useLoaderData() as Paginated<StaffUser>;
  const actionData = useActionData() as UsersActionResult | undefined;
  const submitting = useNavigation().state === "submitting";
  const [params] = useSearchParams();

  const role = params.get("role") ?? "all";
  const isActive = params.get("isActive") ?? "all";
  const hasFilters = role !== "all" || isActive !== "all";

  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "tl" ? "fil-PH" : "en-PH", {
      dateStyle: "medium",
    });

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("adminAccounts")}</h1>
          <p className="text-sm text-muted-foreground">
            {total} {hasFilters ? "matching account(s)" : "total"}
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/create">
            <Plus className="mr-2 h-4 w-4" />
            New Account
          </Link>
        </Button>
      </div>

      <Form method="get" className="flex shrink-0 flex-wrap items-center gap-2">
        <Select name="role" defaultValue={role}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="secretary">Secretary</SelectItem>
            <SelectItem value="lupon">Lupon Member</SelectItem>
          </SelectContent>
        </Select>

        <Select name="isActive" defaultValue={isActive}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Button type="submit">Filter</Button>

        {hasFilters && (
          <Button asChild type="button" variant="ghost">
            <Link to="/admin/accounts">Clear</Link>
          </Button>
        )}

        <div className="ml-auto">
          <DataPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
          />
        </div>
      </Form>

      {actionData?.error && (
        <p className="text-sm font-medium text-destructive">{actionData.error}</p>
      )}

      <div className="-mx-6 min-h-0 flex-1 overflow-x-hidden overflow-y-auto border-y [&>[data-slot=table-container]]:overflow-visible">
        <Table className="[&_td]:px-4 [&_td]:py-3 [&_td]:whitespace-normal [&_th]:px-4 [&_th]:whitespace-normal">
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>{t("email")}</TableHead>
              <TableHead>{t("phone")}</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  {hasFilters ? "No accounts match your filters." : "No accounts yet."}
                </TableCell>
              </TableRow>
            )}
            {items.map((user) => (
              <TableRow key={user.id} className="transition-colors hover:bg-muted/50">
                <TableCell className="font-bold">{user.fullName}</TableCell>
                <TableCell className="text-muted-foreground">@{user.username}</TableCell>
                <TableCell>{user.position}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell className="text-muted-foreground">{user.phone}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {t(ROLE_LABEL[user.role])}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "default" : "secondary"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{date(user.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Form method="post">
                    <input type="hidden" name="intent" value="toggleActive" />
                    <input type="hidden" name="id" value={user.id} />
                    <input
                      type="hidden"
                      name="isActive"
                      value={user.isActive ? "false" : "true"}
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={submitting}
                    >
                      {user.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </Form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
