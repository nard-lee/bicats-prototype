import { Form, Link, useActionData, useNavigation } from "react-router";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NoticeActionResult } from "../types";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm font-medium text-destructive">{message}</p>;
}

export default function CreateNotice() {
  const actionData = useActionData() as NoticeActionResult | undefined;
  const submitting = useNavigation().state === "submitting";
  const fields = actionData?.fields ?? {};

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/notices">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Create Notice</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            {actionData?.error && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>Could not create notice</AlertTitle>
                <AlertDescription>{actionData.error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Office Closure"
                aria-invalid={!!fields.title}
                required
              />
              <FieldError message={fields.title} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Content</Label>
              <Textarea
                id="body"
                name="body"
                rows={6}
                placeholder="Enter the full notice details here..."
                aria-invalid={!!fields.body}
                required
              />
              <FieldError message={fields.body} />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="isPublished" name="isPublished" defaultChecked />
              <Label htmlFor="isPublished" className="text-sm font-normal">
                Publish immediately on the home page
              </Label>
            </div>

            <div className="pt-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Notice"}
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
