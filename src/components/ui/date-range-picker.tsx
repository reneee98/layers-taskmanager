"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { sk } from "date-fns/locale";
import { CalendarDays, Check, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  startDate?: string | null;
  endDate?: string | null;
  onSave: (startDate: string | null, endDate: string | null) => Promise<void>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const formatRangeDate = (value: string) =>
  format(parseISO(value), "d. MMMM yyyy", { locale: sk });

export const DateRangePicker = ({
  startDate,
  endDate,
  onSave,
  placeholder = "Nastaviť termín",
  className,
  disabled = false,
}: DateRangePickerProps) => {
  const [open, setOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [draftStartDate, setDraftStartDate] = React.useState(startDate || "");
  const [draftEndDate, setDraftEndDate] = React.useState(endDate || "");

  const hasSavedRange = Boolean(startDate || endDate);
  const hasCompleteDraft = Boolean(draftStartDate && draftEndDate);

  const resetDraft = React.useCallback(() => {
    setDraftStartDate(startDate || "");
    setDraftEndDate(endDate || "");
  }, [endDate, startDate]);

  React.useEffect(() => {
    if (!open) resetDraft();
  }, [open, resetDraft]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSaving) return;
    if (nextOpen) resetDraft();
    setOpen(nextOpen);
  };

  const handleStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextStartDate = event.target.value;
    setDraftStartDate(nextStartDate);

    if (nextStartDate && draftEndDate && draftEndDate < nextStartDate) {
      setDraftEndDate(nextStartDate);
    }
  };

  const handleEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDraftEndDate(event.target.value);
  };

  const handleDateInputClick = (event: React.MouseEvent<HTMLInputElement>) => {
    if (typeof event.currentTarget.showPicker !== "function") return;

    event.preventDefault();
    event.currentTarget.showPicker();
  };

  const handleSave = async () => {
    if (!hasCompleteDraft || isSaving) return;

    setIsSaving(true);
    try {
      await onSave(draftStartDate, draftEndDate);
      setOpen(false);
    } catch (error) {
      console.error("Error saving date range:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!hasSavedRange || isSaving) return;

    setIsSaving(true);
    try {
      await onSave(null, null);
      setOpen(false);
    } catch (error) {
      console.error("Error removing date range:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const triggerLabel =
    startDate && endDate
      ? `${format(parseISO(startDate), "d. M.", { locale: sk })} – ${format(
          parseISO(endDate),
          "d. M.",
          { locale: sk }
        )}`
      : startDate
        ? format(parseISO(startDate), "d. M.", { locale: sk })
        : placeholder;

  return (
    <Popover open={disabled ? false : open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={hasSavedRange ? `Upraviť termín ${triggerLabel}` : placeholder}
          className={cn(
            "group inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground shadow-sm outline-none transition-[background-color,border-color,box-shadow] duration-150 hover:border-foreground/20 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-60",
            className
          )}
        >
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
          <span className="whitespace-nowrap">{triggerLabel}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={12}
        className="w-[360px] max-w-[calc(100vw-24px)] overflow-hidden p-0"
      >
        <div className="border-b border-border px-4 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-foreground">
              <CalendarDays className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Termín úlohy</p>
              <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                Nastavte obdobie, počas ktorého sa má na úlohe pracovať.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Od
              </span>
              <span className="relative flex h-11 items-center rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm transition-[border-color,box-shadow] focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-ring/15">
                <span aria-hidden="true" className="min-w-0 flex-1 truncate tabular-nums">
                  {draftStartDate ? formatRangeDate(draftStartDate) : "Vybrať dátum"}
                </span>
                <CalendarDays aria-hidden="true" className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  type="date"
                  lang="sk"
                  value={draftStartDate}
                  max={draftEndDate || undefined}
                  onChange={handleStartDateChange}
                  onClick={handleDateInputClick}
                  aria-label="Termín úlohy od"
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                />
              </span>
            </label>

            <label className="space-y-1.5">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Do
              </span>
              <span className="relative flex h-11 items-center rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm transition-[border-color,box-shadow] focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-ring/15">
                <span aria-hidden="true" className="min-w-0 flex-1 truncate tabular-nums">
                  {draftEndDate ? formatRangeDate(draftEndDate) : "Vybrať dátum"}
                </span>
                <CalendarDays aria-hidden="true" className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  type="date"
                  lang="sk"
                  value={draftEndDate}
                  min={draftStartDate || undefined}
                  onChange={handleEndDateChange}
                  onClick={handleDateInputClick}
                  aria-label="Termín úlohy do"
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                />
              </span>
            </label>
          </div>

          <div className="flex min-h-9 items-center rounded-lg border border-border/70 bg-muted/30 px-3 text-[11px] text-muted-foreground">
            {hasCompleteDraft ? (
              <span>
                <span className="font-medium text-foreground">{formatRangeDate(draftStartDate)}</span>
                <span className="mx-1.5">→</span>
                <span className="font-medium text-foreground">{formatRangeDate(draftEndDate)}</span>
              </span>
            ) : (
              "Vyberte oba dátumy. Zmena sa uloží až po potvrdení."
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/20 px-3 py-3">
          <div>
            {hasSavedRange && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isSaving}
                onClick={handleRemove}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Odstrániť
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSaving}
              onClick={() => setOpen(false)}
            >
              Zrušiť
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!hasCompleteDraft || isSaving}
              onClick={handleSave}
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Uložiť
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
