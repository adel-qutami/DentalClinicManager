import { useState, useMemo, useCallback } from "react";
import type { Patient } from "@/lib/store";

interface UsePatientSearchOptions {
  patients: Patient[];
  limit?: number;
}

interface UsePatientSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: Patient[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedIndex: number;
  handleKeyDown: (e: React.KeyboardEvent) => Patient | null;
  resetSearch: () => void;
}

export function usePatientSearch({ patients, limit = 8 }: UsePatientSearchOptions): UsePatientSearchReturn {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return patients
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.phone.includes(q)
      )
      .slice(0, limit);
  }, [query, patients, limit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): Patient | null => {
      if (!isOpen || results.length === 0) {
        if (e.key === "ArrowDown" && results.length > 0) {
          setIsOpen(true);
        }
        return null;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          return null;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          return null;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            const selected = results[selectedIndex];
            setIsOpen(false);
            setQuery(selected.name);
            return selected;
          }
          return null;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          return null;
        default:
          return null;
      }
    },
    [isOpen, results, selectedIndex]
  );

  const resetSearch = useCallback(() => {
    setQuery("");
    setIsOpen(false);
    setSelectedIndex(0);
  }, []);

  return {
    query,
    setQuery: (q: string) => {
      setQuery(q);
      setSelectedIndex(0);
      setIsOpen(q.trim().length > 0);
    },
    results,
    isOpen: isOpen && results.length > 0,
    setIsOpen,
    selectedIndex,
    handleKeyDown,
    resetSearch,
  };
}
