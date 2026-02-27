import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ToothSelectionMode = "single_tooth" | "full_jaw_upper" | "full_jaw_lower" | "full_mouth";

interface ToothSelectorProps {
  selectedTeeth: string[];
  onSelectionChange: (teeth: string[]) => void;
  mode: ToothSelectionMode;
  onModeChange?: (mode: ToothSelectionMode) => void;
  disabled?: boolean;
}

const UPPER_RIGHT = ["18", "17", "16", "15", "14", "13", "12", "11"];
const UPPER_LEFT = ["21", "22", "23", "24", "25", "26", "27", "28"];
const LOWER_RIGHT = ["48", "47", "46", "45", "44", "43", "42", "41"];
const LOWER_LEFT = ["31", "32", "33", "34", "35", "36", "37", "38"];

const ALL_UPPER = [...UPPER_RIGHT, ...UPPER_LEFT];
const ALL_LOWER = [...LOWER_LEFT, ...LOWER_RIGHT];
const ALL_TEETH = [...ALL_UPPER, ...ALL_LOWER];

function isMolar(tooth: string): boolean {
  const num = parseInt(tooth);
  const pos = num % 10;
  return pos >= 6 && pos <= 8;
}

function isPremolar(tooth: string): boolean {
  const num = parseInt(tooth);
  const pos = num % 10;
  return pos >= 4 && pos <= 5;
}

function getToothSize(tooth: string): string {
  if (isMolar(tooth)) return "w-9 h-10 sm:w-10 sm:h-11";
  if (isPremolar(tooth)) return "w-8 h-9 sm:w-9 sm:h-10";
  return "w-7 h-9 sm:w-8 sm:h-10";
}

function Tooth({
  number,
  isSelected,
  onClick,
  disabled,
  position,
}: {
  number: string;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
  position: "upper" | "lower";
}) {
  const size = getToothSize(number);
  const isMolarTooth = isMolar(number);
  const borderRadius = position === "upper"
    ? isMolarTooth ? "rounded-t-xl rounded-b-md" : "rounded-t-lg rounded-b-sm"
    : isMolarTooth ? "rounded-b-xl rounded-t-md" : "rounded-b-lg rounded-t-sm";

  return (
    <button
      type="button"
      data-testid={`tooth-${number}`}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center border-2 transition-all duration-150 text-xs font-semibold cursor-pointer select-none",
        size,
        borderRadius,
        isSelected
          ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
          : "bg-card text-card-foreground border-border hover-elevate",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      {number}
    </button>
  );
}

function ToothRow({
  teeth,
  selectedTeeth,
  onToothClick,
  disabled,
  position,
}: {
  teeth: string[];
  selectedTeeth: string[];
  onToothClick: (tooth: string) => void;
  disabled?: boolean;
  position: "upper" | "lower";
}) {
  return (
    <div className="flex items-end justify-center gap-0.5 sm:gap-1 flex-wrap" dir="ltr">
      {teeth.map((tooth) => (
        <Tooth
          key={tooth}
          number={tooth}
          isSelected={selectedTeeth.includes(tooth)}
          onClick={() => onToothClick(tooth)}
          disabled={disabled}
          position={position}
        />
      ))}
    </div>
  );
}

export function ToothSelector({
  selectedTeeth,
  onSelectionChange,
  mode,
  onModeChange,
  disabled,
}: ToothSelectorProps) {
  const handleModeChange = (newMode: ToothSelectionMode) => {
    if (!onModeChange) return;
    onModeChange(newMode);

    if (newMode === "full_jaw_upper") {
      onSelectionChange([...ALL_UPPER]);
    } else if (newMode === "full_jaw_lower") {
      onSelectionChange([...ALL_LOWER]);
    } else if (newMode === "full_mouth") {
      onSelectionChange([...ALL_TEETH]);
    } else {
      onSelectionChange([]);
    }
  };

  const handleToothClick = (tooth: string) => {
    if (disabled) return;

    if (mode === "full_jaw_upper" || mode === "full_jaw_lower" || mode === "full_mouth") {
      return;
    }

    const isSelected = selectedTeeth.includes(tooth);
    if (isSelected) {
      onSelectionChange(selectedTeeth.filter((t) => t !== tooth));
    } else {
      onSelectionChange([...selectedTeeth, tooth]);
    }
  };

  const jawLocked = mode === "full_jaw_upper" || mode === "full_jaw_lower" || mode === "full_mouth";

  const modeButtons: { value: ToothSelectionMode; label: string }[] = [
    { value: "single_tooth", label: "أسنان محددة" },
    { value: "full_jaw_upper", label: "فك علوي كامل" },
    { value: "full_jaw_lower", label: "فك سفلي كامل" },
    { value: "full_mouth", label: "فم كامل" },
  ];

  return (
    <div className="space-y-4" data-testid="tooth-selector">
      {onModeChange && (
        <div className="flex flex-wrap gap-2 justify-center">
          {modeButtons.map((btn) => (
            <Button
              key={btn.value}
              type="button"
              size="sm"
              variant={mode === btn.value ? "default" : "outline"}
              className={cn(mode === btn.value && "toggle-elevate toggle-elevated")}
              onClick={() => handleModeChange(btn.value)}
              disabled={disabled}
              data-testid={`mode-${btn.value}`}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      )}

      <div className="p-4 rounded-md border bg-muted/30 space-y-3">
        <div className="text-center">
          <div className="flex items-center justify-between gap-2 mb-2 px-2" dir="ltr">
            <span className="text-xs text-muted-foreground">يمين المريض</span>
            <span className="text-xs font-medium">الفك العلوي</span>
            <span className="text-xs text-muted-foreground">يسار المريض</span>
          </div>
          <ToothRow
            teeth={[...UPPER_RIGHT, ...UPPER_LEFT]}
            selectedTeeth={selectedTeeth}
            onToothClick={handleToothClick}
            disabled={disabled || jawLocked}
            position="upper"
          />
        </div>

        <div className="border-t border-dashed border-border mx-4" />

        <div className="text-center">
          <ToothRow
            teeth={[...LOWER_RIGHT, ...LOWER_LEFT]}
            selectedTeeth={selectedTeeth}
            onToothClick={handleToothClick}
            disabled={disabled || jawLocked}
            position="lower"
          />
          <div className="flex items-center justify-between gap-2 mt-2 px-2" dir="ltr">
            <span className="text-xs text-muted-foreground">يمين المريض</span>
            <span className="text-xs font-medium">الفك السفلي</span>
            <span className="text-xs text-muted-foreground">يسار المريض</span>
          </div>
        </div>
      </div>

      {selectedTeeth.length > 0 && (
        <div className="text-sm text-muted-foreground text-center" data-testid="text-selected-teeth">
          الأسنان المحددة: <span className="font-medium text-foreground">{selectedTeeth.sort().join("، ")}</span>
          <span className="text-xs mr-2">({selectedTeeth.length} سن)</span>
        </div>
      )}
    </div>
  );
}
