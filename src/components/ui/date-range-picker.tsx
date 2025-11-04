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
}

export const DateRangePicker = ({
  startDate,
  endDate,
  onSave,
  placeholder = "Vyberte dátum",
  className,
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
      setSelectedRange({
        from: range.from,
        to: range.to,
      });
      
      // Ak sú oba dátumy vybrané, automaticky uložíme
      if (range.from && range.to) {
        handleSave(range.from, range.to);
      }
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
      return `${format(start, "dd.MM.yyyy", { locale: sk })} - ${format(end, "dd.MM.yyyy", { locale: sk })}`;
    }
    if (start) {
      return `${format(start, "dd.MM.yyyy", { locale: sk })} - ${placeholder}`;
    }
    return placeholder;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-2 cursor-pointer hover:bg-muted/80 bg-muted rounded-md px-3 py-2 h-[2.5rem] transition-colors group border border-border",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground flex-1">
            {formatDateRange()}
          </span>
          {(start || end) && (
            <X
              className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-foreground"
              onClick={handleClear}
            />
          )}
        </div>
      </PopoverTrigger>
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
    </Popover>
  );
};

