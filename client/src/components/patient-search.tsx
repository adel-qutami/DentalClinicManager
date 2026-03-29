import { useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, User, Phone, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePatientSearch } from "@/hooks/use-patient-search";
import type { Patient } from "@/lib/store";

interface PatientSearchProps {
  patients: Patient[];
  value: string;
  onSelect: (patientId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function PatientSearch({
  patients,
  value,
  onSelect,
  placeholder = "ابحث بالاسم أو رقم الهاتف...",
  disabled = false,
}: PatientSearchProps) {
  const selectedPatient = patients.find((p) => p.id === value);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const {
    query,
    setQuery,
    results,
    isOpen,
    setIsOpen,
    selectedIndex,
    handleKeyDown,
    resetSearch,
  } = usePatientSearch({ patients });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsOpen]);

  useEffect(() => {
    if (listRef.current && isOpen) {
      const activeItem = listRef.current.children[selectedIndex] as HTMLElement;
      activeItem?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, isOpen]);

  const handleSelect = (patient: Patient) => {
    onSelect(patient.id);
    setQuery(patient.name);
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect("");
    resetSearch();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const selected = handleKeyDown(e);
    if (selected) {
      handleSelect(selected);
    }
  };

  return (
    <div ref={containerRef} className="relative" data-testid="patient-search">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={selectedPatient && !isOpen ? selectedPatient.name : query}
          onChange={(e) => {
            if (selectedPatient && !isOpen) {
              onSelect("");
            }
            setQuery(e.target.value);
          }}
          onFocus={() => {
            if (selectedPatient) {
              setQuery(selectedPatient.name);
            }
            if (query.trim().length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "pr-9 pl-8 transition-colors",
            selectedPatient && !isOpen && "border-primary/50 bg-primary/5"
          )}
          data-testid="input-patient-search"
        />
        {(selectedPatient || query) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-clear-patient"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-lg shadow-lg max-h-60 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-150"
          data-testid="patient-search-results"
        >
          {results.map((patient, index) => (
            <button
              key={patient.id}
              type="button"
              onClick={() => handleSelect(patient)}
              onMouseEnter={() => {}}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-right transition-colors cursor-pointer",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted/50"
              )}
              data-testid={`patient-result-${patient.id}`}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                {patient.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="font-medium text-sm truncate">{patient.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground" dir="ltr">{patient.countryCode || "+967"} {patient.phone}</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {patient.age} سنة
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
