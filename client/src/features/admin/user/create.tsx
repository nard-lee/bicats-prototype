
import { useEffect, useRef } from "react";
import {
    Form,
    Link,
    useActionData,
    useNavigation,
} from "react-router";
import { UserPlus, AlertCircle, InfoIcon, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/I18n";
import type { ActionResult } from "./create-action";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return (<p className="text-sm font-medium text-destructive">{message}</p>);
}

export default function CreateUser() {
    const { t } = useT();
    const actionData = useActionData() as ActionResult | undefined;
    const submitting = useNavigation().state === "submitting";
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (actionData?.success) formRef.current?.reset();
    }, [actionData]);

    const fields = actionData?.fields ?? {};

    return (
        <div className="flex  w-full items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
            <div className="w-full max-w-4xl space-y-8">
                <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="-ml-2 w-fit text-muted-foreground"
                >
                    <Link to="/admin/accounts">
                        <ArrowLeft />
                        {t("backToList")}
                    </Link>
                </Button>

                {/* Header */}
                <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <UserPlus className="size-8" />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                            {t("adminCreate")}
                        </h1>
                        <p className="text-base text-muted-foreground">
                            {t("staffOnly")}
                        </p>
                    </div>
                </div>

                {/* Form card */}
                <div className="rounded-2xl sm:p-8 lg:p-10">
                    <Form
                        ref={formRef}
                        method="post"
                        className="space-y-7"
                    >
                        {(actionData?.message ||
                            (actionData?.error && !actionData.message)) && (

                                <Alert variant="destructive">
                                    <AlertCircle className="mt-0.5 size-5 shrink-0" />
                                    <AlertTitle>{actionData.message || t(actionData.error!)}</AlertTitle>
                                    <AlertDescription>
                                        {Object.keys(fields).length > 0 && (
                                            <p className="text-sm">{t("reviewFields")}</p>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            )}

                        {actionData?.success && (
                            <Alert>
                                <InfoIcon />
                                <AlertTitle>Success</AlertTitle>
                                <AlertDescription>
                                    Account created.
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Full name and position */}
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="fullName">{t("fullName")}</Label>
                                <Input
                                    id="fullName"
                                    name="fullName"
                                    placeholder="Juan Dela Cruz"
                                    className="h-11"
                                    aria-invalid={!!fields.fullName}
                                    required
                                />
                                <FieldError message={fields.fullName} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="position">{t("position")}</Label>
                                <Input
                                    id="position"
                                    name="position"
                                    placeholder="Barangay Secretary"
                                    className="h-11"
                                    aria-invalid={!!fields.position}
                                    required
                                />
                                <FieldError message={fields.position} />
                            </div>
                        </div>

                        {/* Email and phone */}
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="email">{t("email")}</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="juan@example.com"
                                    autoComplete="off"
                                    className="h-11"
                                    aria-invalid={!!fields.email}
                                    required
                                />
                                <FieldError message={fields.email} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">{t("phone")}</Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    placeholder="+639171234567"
                                    autoComplete="off"
                                    className="h-11"
                                    aria-invalid={!!fields.phone}
                                    required
                                />
                                <FieldError message={fields.phone} />
                            </div>
                        </div>

                        {/* Username and role */}
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="username">{t("username")}</Label>
                                <Input
                                    id="username"
                                    name="username"
                                    placeholder="juan123"
                                    autoComplete="off"
                                    className="h-11"
                                    aria-invalid={!!fields.username}
                                    required
                                />
                                <FieldError message={fields.username} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="role">{t("role")}</Label>
                                <Select name="role" defaultValue="staff">
                                    <SelectTrigger id="role" className="h-11 w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="staff">
                                            {t("roleStaff")}
                                        </SelectItem>
                                        <SelectItem value="secretary">
                                            {t("roleSecretary")}
                                        </SelectItem>
                                        <SelectItem value="lupon">
                                            {t("roleLupon")}
                                        </SelectItem>
                                        <SelectItem value="admin">
                                            {t("roleAdmin")}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <FieldError message={fields.role} />
                            </div>
                        </div>

                        {/* Passwords */}
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="password">{t("password")}</Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder="At least 8 characters"
                                    minLength={8}
                                    className="h-11"
                                    aria-invalid={!!fields.password}
                                    required
                                />
                                <FieldError message={fields.password} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm">{t("confirm")}</Label>
                                <Input
                                    id="confirm"
                                    name="confirm"
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder="Re-enter password"
                                    className="h-11"
                                    aria-invalid={!!fields.confirm}
                                    required
                                />
                                <FieldError message={fields.confirm} />
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="border-t pt-6">
                            <Button
                                type="submit"
                                size="lg"
                                className="h-12 w-full text-base font-semibold"
                                disabled={submitting}
                            >
                                {submitting ? t("creating") : t("createAccount")}
                            </Button>
                        </div>
                    </Form>
                </div>
            </div>
        </div>
    );
}