"use client";

import * as React from "react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  startDate?: string | null;
  endDate?: string | null;
  onSave: (startDate: string | null, endDate: string | null) => Promise<void>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const DateRangePicker = ({
  startDate,
  endDate,
  onSave,
  placeholder = "Vyberte dátum",
  className,
  disabled = false,
}: DateRangePickerProps) => {
  const [open, setOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const start = startDate ? new Date(startDate) : undefined;
  const end = endDate ? new Date(endDate) : undefined;
  
  const [selectedRange, setSelectedRange] = React.useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: start,
    to: end,
  });

  React.useEffect(() => {
    setSelectedRange({
      from: start,
      to: end,
    });
  }, [startDate, endDate]);

  const handleSelect = (range: DateRange | undefined) => {
    if (range) {
      // Ak používateľ už má oba dátumy vybrané a klikne na nový dátum,
      // resetujeme range a začneme nový výber (prvý klik = start date)
      if (selectedRange.from && selectedRange.to && range.from && !range.to) {
        setSelectedRange({
          from: range.from,
          to: undefined,
        });
      } else {
        // Normálne správanie:
        // - Prvý klik nastaví from (start date)
        // - Druhý klik nastaví to (end date)
        setSelectedRange({
          from: range.from,
          to: range.to,
        });
      }
    } else {
      // Ak je range undefined, resetujeme
      setSelectedRange({
        from: undefined,
        to: undefined,
      });
    }
  };

  const handleSave = async (from?: Date, to?: Date) => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const fromDate = from ? format(from, "yyyy-MM-dd") : null;
      const toDate = to ? format(to, "yyyy-MM-dd") : null;
      await onSave(fromDate, toDate);
      setOpen(false);
    } catch (error) {
      console.error("Error saving date range:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await handleSave(undefined, undefined);
  };

  const formatDateRange = () => {
    if (start && end) {
      // Format as "1. 12. - 20. 12." (short date format matching Figma)
      return `${format(start, "d. M.", { locale: sk })} - ${format(end, "d. M.", { locale: sk })}`;
    }
    if (start) {
      return `${format(start, "d. M.", { locale: sk })}`;
    }
    if (end) {
      return `${format(end, "d. M.", { locale: sk })}`;
    }
    return placeholder;
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    
    // Keď sa popover zavrie, uložíme vybrané dátumy
    if (!newOpen && !isSaving) {
      handleSave(selectedRange.from, selectedRange.to);
    }
  };

  return (
    <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : handleOpenChange}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "bg-white dark:bg-card border border-[#e2e8f0] dark:border-border flex gap-2 h-[36px] items-center px-[13px] py-px rounded-full shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] transition-colors group",
            disabled ? "cursor-default" : "cursor-pointer hover:bg-slate-50 dark:hover:bg-card/80",
            className
          )}
        >
          <CalendarIcon className="h-[14px] w-[14px] text-[#62748e] dark:text-muted-foreground shrink-0" />
          <span className="font-medium leading-6 text-[#314158] dark:text-foreground text-[12px] text-center tracking-[-0.3125px] whitespace-nowrap">
            {formatDateRange()}
          </span>
          {!disabled && (start || end) && (
            <X
              className="h-3 w-3 text-[#62748e] dark:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-[#314158] dark:hover:text-foreground shrink-0"
              onClick={handleClear}
            />
          )}
        </div>
      </PopoverTrigger>
      {!disabled && (
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={selectedRange}
            onSelect={handleSelect}
            numberOfMonths={2}
            initialFocus
            disabled={(date) => date < new Date("1900-01-01")}
          />
        </PopoverContent>
      )}
    </Popover>
  );
};

