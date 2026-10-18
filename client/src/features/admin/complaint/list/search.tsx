import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { Loader2, Search } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { ComplaintListItem, Paginated } from "./loader";

export function ComplaintSearch({ defaultValue = "" }: { defaultValue?: string }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<ComplaintListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced live search
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api
          .post("/complaints/list", {
            searchParams: { q: term, pageSize: 6 },
            signal: controller.signal,
          })
          .json<Paginated<ComplaintListItem>>();
        setResults(data.items);
        setActive(-1);
      } catch {
        // Request aborted or failed — keep the previous results.
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Close when clicking outside
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const term = query.trim();
  const showDropdown = open && term.length >= 2;

  function handleChange(value: string) {
    setQuery(value);
    setOpen(true);
    if (value.trim().length < 2) {
      setResults([]);
      setLoading(false);
    }
  }

  function submitAll() {
    if (!term) return;
    setOpen(false);
    navigate(`/admin/complaints?q=${encodeURIComponent(term)}`);
  }

  function openComplaint(item: ComplaintListItem) {
    setOpen(false);
    navigate(`/admin/complaints/${item.id}`);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (active >= 0 && results[active]) openComplaint(results[active]);
      else submitAll();
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative w-full sm:w-80">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => term.length >= 2 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search complaints..."
        className="pl-9"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="complaint-search-results"
        autoComplete="off"
      />
      {loading && (
        <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}

      {showDropdown && (
        <div
          id="complaint-search-results"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {loading ? "Searching..." : "No matches found."}
            </p>
          ) : (
            <ul className="max-h-72 overflow-auto py-1">
              {results.map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => openComplaint(item)}
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm",
                      index === active && "bg-accent text-accent-foreground",
                    )}
                  >
                    <span className="font-medium">{item.reference}</span>
                    <span className="line-clamp-1 text-xs text-muted-foreground">
                      {item.complainantName} vs {item.respondentName}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
