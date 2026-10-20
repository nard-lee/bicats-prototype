import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { HTTPError } from "ky";
import { Button } from "@/components/ui/button";

export default function AdminError() {
  const error = useRouteError();

  let status = 500;
  let message = "Something went wrong while loading this page.";

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (status === 401) message = "Your session has ended. Please sign in again.";
    else if (status === 403) message = "You don't have permission to view this page.";
    else if (status === 404) message = "We couldn't find what you were looking for.";
    else message = error.statusText || message;
  } else if (error instanceof HTTPError) {
    status = error.response.status;
    if (status === 403) message = "You don't have permission to view this page.";
    else if (status === 404) message = "We couldn't find what you were looking for.";
    else if (status >= 500) message = "The server is temporarily unavailable. Please try again shortly.";
  } else if (error instanceof Error) {
    message = "We couldn't reach the server. Check your connection and try again.";
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <p className="text-4xl font-semibold">{status}</p>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button asChild variant="outline" size="sm">
        <Link to="/admin">Back to Overview</Link>
      </Button>
    </div>
  );
}
