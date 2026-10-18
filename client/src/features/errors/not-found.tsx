import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-5xl font-bold tracking-tight">404</p>
      <p className="text-sm text-muted-foreground">
        We couldn't find the page you were looking for.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  );
}
