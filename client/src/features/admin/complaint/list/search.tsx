import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { Clock, History, Loader2, Search } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { ComplaintListItem, Paginated } from "./loader";

const HISTORY_KEY = "bicats:recent-searches";

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string").slice(0, 8)
      : [];
  } catch {
    return [];
  }
}

function rememberSearch(term: string) {
  const next = [term, ...loadHistory().filter((item) => item !== term)].slice(0, 8);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export function ComplaintSearch({ defaultValue = "" }: { defaultValue?: string }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<ComplaintListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>(() => loadHistory());
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
            searchParams: { q: term, pageSize: 8 },
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
  const showResults = term.length >= 2;
  const showRecents = term.length < 2 && recent.length > 0;
  const showDropdown = open && (showResults || showRecents);

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
    rememberSearch(term);
    setRecent(loadHistory());
    setOpen(false);
    navigate(`/admin/complaints?q=${encodeURIComponent(term)}`);
  }

  function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    setRecent([]);
    setActive(-1);
  }

  function openComplaint(item: ComplaintListItem) {
    if (term.length >= 2) {
      rememberSearch(term);
      setRecent(loadHistory());
    }
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
    <div ref={boxRef} className="relative w-full sm:w-[26rem]">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
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

      {showDropdown && showRecents && (
        <div
          id="complaint-search-results"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          <div className="flex items-center justify-between px-3 pt-2 pb-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <History className="h-3.5 w-3.5" />
              Recent searches
            </span>
            <button
              type="button"
              onClick={clearHistory}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear
            </button>
          </div>
          <ul className="py-1">
            {recent.map((item, index) => (
              <li key={item}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => {
                    rememberSearch(item);
                    setOpen(false);
                    navigate(`/admin/complaints?q=${encodeURIComponent(item)}`);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                    index === active && "bg-accent text-accent-foreground",
                  )}
                >
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{item}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showDropdown && showResults && (
        <div
          id="complaint-search-results"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {loading ? "Searching..." : "No matches found."}
            </p>
          ) : (
            <ul className="max-h-96 overflow-auto py-1">
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
                      {item.complainantName} and {item.respondentName}
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
