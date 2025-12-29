"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import "./WeekView.css";

export interface CalendarTask {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  assigneeId?: string;
  assigneeName?: string;
  assigneeColor?: string;
  project?: {
    id: string;
    name: string;
  };
  status?: string;
  priority?: string;
}

export interface WeekViewProps {
  tasks: CalendarTask[];
  currentDate?: Date;
  onTaskClick?: (task: CalendarTask) => void;
  onCreateTask?: (start: Date, end: Date) => void;
  selectedUserIds?: string[];
  users?: Array<{
    id: string;
    name: string;
    email?: string;
    color?: string;
  }>;
}

interface TimeSlot {
  hour: number;
  minute: number;
  label: string;
}

interface DayColumn {
  date: Date;
  dayLabel: string;
  dateLabel: string;
  isToday: boolean;
}

interface EventLayout {
  task: CalendarTask;
  left: number;
  width: number;
  top: number;
  height: number;
  column: number;
}

const TIME_SLOTS: TimeSlot[] = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = (i % 2) * 30;
  return {
    hour,
    minute,
    label: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
  };
});

const DAY_LABELS = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

// Europe/Bratislava timezone handling with DST
function getBratislavaDate(date: Date): Date {
  // Convert to Bratislava timezone using Intl API
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Bratislava",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find(p => p.type === "year")!.value);
  const month = parseInt(parts.find(p => p.type === "month")!.value) - 1;
  const day = parseInt(parts.find(p => p.type === "day")!.value);
  const hour = parseInt(parts.find(p => p.type === "hour")!.value);
  const minute = parseInt(parts.find(p => p.type === "minute")!.value);
  const second = parseInt(parts.find(p => p.type === "second")!.value);
  
  return new Date(year, month, day, hour, minute, second);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "short",
  });
}

function getWeekStart(date: Date): Date {
  // Convert to Bratislava timezone first
  const bratislavaDate = getBratislavaDate(date);
  const d = new Date(bratislavaDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday = 1
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function getWeekDays(weekStart: Date): DayColumn[] {
  const todayBratislava = getBratislavaDate(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    date.setHours(0, 0, 0, 0);
    
    const isToday =
      date.getDate() === todayBratislava.getDate() &&
      date.getMonth() === todayBratislava.getMonth() &&
      date.getFullYear() === todayBratislava.getFullYear();
    
    return {
      date,
      dayLabel: DAY_LABELS[i],
      dateLabel: formatDate(date),
      isToday,
    };
  });
}

function getMinutesFromMidnight(date: Date): number {
  // Convert to Bratislava timezone for accurate time calculation
  const bratislavaDate = getBratislavaDate(date);
  return bratislavaDate.getHours() * 60 + bratislavaDate.getMinutes();
}

function calculateEventLayout(
  events: CalendarTask[],
  dayStart: Date,
  dayEnd: Date
): EventLayout[] {
  if (events.length === 0) return [];

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());

  // Group events by overlapping using greedy algorithm
  const columns: CalendarTask[][] = [];
  const eventColumns: Map<CalendarTask, number> = new Map();

  sortedEvents.forEach((event) => {
    let placedColumn = -1;
    
    // Find first column where event doesn't overlap
    for (let colIndex = 0; colIndex < columns.length; colIndex++) {
      const column = columns[colIndex];
      const overlaps = column.some((existingEvent) => {
        return !(
          event.end <= existingEvent.start ||
          event.start >= existingEvent.end
        );
      });

      if (!overlaps) {
        placedColumn = colIndex;
        break;
      }
    }

    // If no column found, create new one
    if (placedColumn === -1) {
      placedColumn = columns.length;
      columns.push([]);
    }

    columns[placedColumn].push(event);
    eventColumns.set(event, placedColumn);
  });

  // Calculate positions for each event
  const layouts: EventLayout[] = sortedEvents.map((event) => {
    const colIndex = eventColumns.get(event)!;
    
    // Find max column index for events that overlap with this one
    let maxCol = colIndex;
    sortedEvents.forEach((otherEvent) => {
      if (event !== otherEvent) {
        const overlaps = !(
          event.end <= otherEvent.start ||
          event.start >= otherEvent.end
        );
        if (overlaps) {
          const otherCol = eventColumns.get(otherEvent)!;
          if (otherCol > maxCol) {
            maxCol = otherCol;
          }
        }
      }
    });

    const totalCols = maxCol + 1;
    const dayStartMinutes = getMinutesFromMidnight(dayStart);
    const startMinutes = getMinutesFromMidnight(event.start);
    const endMinutes = getMinutesFromMidnight(event.end);
    
    const top = ((startMinutes - dayStartMinutes) / 60) * 100;
    const height = ((endMinutes - startMinutes) / 60) * 100;
    const left = (colIndex / totalCols) * 100;
    const width = (1 / totalCols) * 100;

    return {
      task: event,
      left,
      width,
      top,
      height,
      column: colIndex,
    };
  });

  return layouts;
}

export function WeekView({
  tasks,
  currentDate = new Date(),
  onTaskClick,
  onCreateTask,
  selectedUserIds,
  users = [],
}: WeekViewProps) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(currentDate));
  const [currentTime, setCurrentTime] = useState(new Date());
  const gridRef = useRef<HTMLDivElement>(null);
  const nowIndicatorRef = useRef<HTMLDivElement>(null);

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Also update on mount to ensure correct initial time
  useEffect(() => {
    setCurrentTime(new Date());
  }, []);

  // Filter tasks by selected users
  const filteredTasks = useMemo(() => {
    if (!selectedUserIds || selectedUserIds.length === 0) {
      return tasks;
    }
    return tasks.filter((task) => {
      if (!task.assigneeId) return false;
      return selectedUserIds.includes(task.assigneeId);
    });
  }, [tasks, selectedUserIds]);

  // Separate all-day and timed events
  const { allDayEvents, timedEvents } = useMemo(() => {
    const allDay: CalendarTask[] = [];
    const timed: CalendarTask[] = [];

    filteredTasks.forEach((task) => {
      if (task.allDay) {
        allDay.push(task);
      } else {
        timed.push(task);
      }
    });

    return { allDayEvents: allDay, timedEvents: timed };
  }, [filteredTasks]);

  // Group timed events by day (handle multi-day events)
  const eventsByDay = useMemo(() => {
    const grouped: Map<number, CalendarTask[]> = new Map();

    timedEvents.forEach((event) => {
      // Convert event times to Bratislava timezone for comparison
      const eventStartBratislava = getBratislavaDate(event.start);
      const eventEndBratislava = getBratislavaDate(event.end);
      
      weekDays.forEach((day, dayIndex) => {
        const dayStart = new Date(day.date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day.date);
        dayEnd.setHours(23, 59, 59, 999);

        // Check if event overlaps with this day
        if (eventEndBratislava >= dayStart && eventStartBratislava <= dayEnd) {
          if (!grouped.has(dayIndex)) {
            grouped.set(dayIndex, []);
          }
          grouped.get(dayIndex)!.push(event);
        }
      });
    });

    return grouped;
  }, [timedEvents, weekDays]);

  // Calculate event layouts for each day
  const eventLayoutsByDay = useMemo(() => {
    const layouts: Map<number, EventLayout[]> = new Map();

    eventsByDay.forEach((events, dayIndex) => {
      const day = weekDays[dayIndex];
      const dayStart = new Date(day.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day.date);
      dayEnd.setHours(23, 59, 59, 999);

      // Normalize events to day boundaries for this specific day
      const normalizedEvents = events.map(event => {
        const eventStartBratislava = getBratislavaDate(event.start);
        const eventEndBratislava = getBratislavaDate(event.end);
        
        // Clip event to day boundaries
        const clippedStart = eventStartBratislava < dayStart ? dayStart : eventStartBratislava;
        const clippedEnd = eventEndBratislava > dayEnd ? dayEnd : eventEndBratislava;
        
        return {
          ...event,
          start: clippedStart,
          end: clippedEnd,
        };
      });

      const layoutsForDay = calculateEventLayout(normalizedEvents, dayStart, dayEnd);
      layouts.set(dayIndex, layoutsForDay);
    });

    return layouts;
  }, [eventsByDay, weekDays]);

  // Get user color
  const getUserColor = useCallback(
    (userId?: string): string => {
      if (!userId) return "#6b7280";
      const user = users.find((u) => u.id === userId);
      if (user?.color) return user.color;
      
      // Generate color from user ID hash
      let hash = 0;
      for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
      }
      const colors = [
        "#3b82f6", // blue
        "#10b981", // emerald
        "#f59e0b", // amber
        "#8b5cf6", // purple
        "#ec4899", // pink
        "#06b6d4", // cyan
        "#6366f1", // indigo
        "#14b8a6", // teal
        "#f97316", // orange
        "#a855f7", // violet
      ];
      return colors[Math.abs(hash) % colors.length];
    },
    [users]
  );

  // Navigate weeks
  const goToPreviousWeek = () => {
    const newWeekStart = new Date(weekStart);
    newWeekStart.setDate(weekStart.getDate() - 7);
    setWeekStart(newWeekStart);
  };

  const goToNextWeek = () => {
    const newWeekStart = new Date(weekStart);
    newWeekStart.setDate(weekStart.getDate() + 7);
    setWeekStart(newWeekStart);
  };

  const goToToday = () => {
    setWeekStart(getWeekStart(new Date()));
  };

  // Calculate current time position in Bratislava timezone
  const currentTimePosition = useMemo(() => {
    const todayBratislava = getBratislavaDate(new Date());
    const todayIndex = weekDays.findIndex((day) => day.isToday);
    
    if (todayIndex === -1) return null;

    const minutes = todayBratislava.getHours() * 60 + todayBratislava.getMinutes();
    const seconds = todayBratislava.getSeconds();
    const totalMinutes = minutes + seconds / 60;
    
    return {
      dayIndex: todayIndex,
      top: (totalMinutes / 1440) * 100,
    };
  }, [weekDays, currentTime]);

  // Auto-scroll to current time on mount and when navigating to current week
  const [hasScrolled, setHasScrolled] = useState(false);
  
  useEffect(() => {
    if (currentTimePosition && gridRef.current && !hasScrolled) {
      const grid = gridRef.current;
      const scrollTop = (grid.scrollHeight * currentTimePosition.top) / 100 - grid.clientHeight / 2;
      grid.scrollTo({ top: Math.max(0, scrollTop), behavior: "smooth" });
      setHasScrolled(true);
    }
  }, [currentTimePosition, hasScrolled]);

  // Reset scroll flag when week changes
  useEffect(() => {
    setHasScrolled(false);
  }, [weekStart]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with input fields
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLButtonElement ||
          (e.target as HTMLElement).isContentEditable) {
        return;
      }

      // Check if focus is within week-view
      const weekViewElement = document.querySelector('.week-view');
      if (!weekViewElement || !weekViewElement.contains(e.target as Node)) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          goToPreviousWeek();
          break;
        case "ArrowRight":
          e.preventDefault();
          goToNextWeek();
          break;
        case "Home":
          e.preventDefault();
          goToToday();
          break;
        case "Escape":
          // Blur any focused elements
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [weekStart]);

  const handleTaskClick = (task: CalendarTask) => {
    if (onTaskClick) {
      onTaskClick(task);
    }
  };

  const handleCellClick = (dayIndex: number, hour: number, minute: number) => {
    if (onCreateTask) {
      const date = new Date(weekDays[dayIndex].date);
      date.setHours(hour, minute, 0, 0);
      // Convert to UTC for API calls, but store in local representation
      const endDate = new Date(date);
      endDate.setHours(hour + 1, minute, 0, 0);
      onCreateTask(date, endDate);
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent, dayIndex: number, hour: number, minute: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCellClick(dayIndex, hour, minute);
    }
  };

  return (
    <div className="week-view" role="application" aria-label="Týždenný kalendár">
      {/* Header */}
      <div className="week-view-header">
        <div className="week-view-nav">
          <button
            type="button"
            onClick={goToPreviousWeek}
            aria-label="Predchádzajúci týždeň"
            className="week-view-nav-button"
          >
            ←
          </button>
          <button
            type="button"
            onClick={goToToday}
            aria-label="Dnes"
            className="week-view-nav-button"
          >
            Dnes
          </button>
          <button
            type="button"
            onClick={goToNextWeek}
            aria-label="Nasledujúci týždeň"
            className="week-view-nav-button"
          >
            →
          </button>
        </div>
        <div className="week-view-title">
          {weekDays[0].date.toLocaleDateString("sk-SK", {
            day: "numeric",
            month: "long",
          })}{" "}
          -{" "}
          {weekDays[6].date.toLocaleDateString("sk-SK", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="week-view-all-day">
          <div className="week-view-all-day-label">Celý deň</div>
          <div className="week-view-all-day-grid">
            {weekDays.map((day, dayIndex) => {
              // Filter events that occur on this day (handle multi-day events)
              const dayEvents = allDayEvents.filter((event) => {
                const eventStartBratislava = getBratislavaDate(event.start);
                const eventEndBratislava = getBratislavaDate(event.end);
                
                const dayStart = new Date(day.date);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(day.date);
                dayEnd.setHours(23, 59, 59, 999);
                
                // Check if event overlaps with this day
                return eventEndBratislava >= dayStart && eventStartBratislava <= dayEnd;
              });

              return (
                <div
                  key={dayIndex}
                  className={`week-view-all-day-cell ${day.isToday ? "week-view-today" : ""}`}
                  role="gridcell"
                  aria-label={`${day.dayLabel} ${day.dateLabel}`}
                >
                  {dayEvents.map((event) => {
                    const color = getUserColor(event.assigneeId);
                    const eventStartBratislava = getBratislavaDate(event.start);
                    const eventEndBratislava = getBratislavaDate(event.end);
                    const dayStart = new Date(day.date);
                    dayStart.setHours(0, 0, 0, 0);
                    const dayEnd = new Date(day.date);
                    dayEnd.setHours(23, 59, 59, 999);
                    
                    // Calculate if this is a multi-day event and show segment
                    const isMultiDay = eventStartBratislava < dayStart || eventEndBratislava > dayEnd;
                    const isStart = eventStartBratislava >= dayStart && eventStartBratislava <= dayEnd;
                    const isEnd = eventEndBratislava >= dayStart && eventEndBratislava <= dayEnd;
                    
                    return (
                      <div
                        key={event.id}
                        className="week-view-all-day-event"
                        style={{
                          backgroundColor: color + "20",
                          borderLeftColor: color,
                          color: color,
                        }}
                        onClick={() => handleTaskClick(event)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Úloha: ${event.title}${isMultiDay ? `, ${isStart ? 'začiatok' : isEnd ? 'koniec' : 'pokračovanie'}` : ''}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleTaskClick(event);
                          }
                        }}
                      >
                        {isStart && !isEnd && isMultiDay && "→ "}
                        {!isStart && !isEnd && isMultiDay && "..."}
                        {isEnd && !isStart && isMultiDay && "← "}
                        {event.title}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="week-view-grid-container" ref={gridRef}>
        <div className="week-view-grid" role="grid" aria-label="Týždenný kalendár">
          {/* Time column */}
          <div className="week-view-time-column" role="columnheader">
            {TIME_SLOTS.map((slot, index) => (
              <div key={index} className="week-view-time-slot">
                {slot.minute === 0 ? slot.label : ""}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, dayIndex) => {
            const layouts = eventLayoutsByDay.get(dayIndex) || [];
            const isToday = day.isToday;

            return (
              <div
                key={dayIndex}
                className={`week-view-day-column ${isToday ? "week-view-today" : ""}`}
                role="column"
                aria-label={`${day.dayLabel} ${day.dateLabel}`}
              >
                {/* Day header */}
                <div className="week-view-day-header" role="columnheader">
                  <div className="week-view-day-label">{day.dayLabel}</div>
                  <div className={`week-view-date-label ${isToday ? "week-view-date-today" : ""}`}>
                    {day.dateLabel}
                  </div>
                </div>

                {/* Time slots */}
                <div className="week-view-day-slots">
                  {TIME_SLOTS.map((slot, slotIndex) => (
                    <div
                      key={slotIndex}
                      className="week-view-slot"
                      role="gridcell"
                      aria-label={`${day.dayLabel} ${slot.label}`}
                      onClick={() => handleCellClick(dayIndex, slot.hour, slot.minute)}
                      onKeyDown={(e) => handleCellKeyDown(e, dayIndex, slot.hour, slot.minute)}
                      tabIndex={0}
                    />
                  ))}
                </div>

                {/* Events */}
                <div className="week-view-events-container">
                  {layouts.map((layout, layoutIndex) => {
                    const color = getUserColor(layout.task.assigneeId);
                    return (
                      <div
                        key={`${layout.task.id}-${layoutIndex}`}
                        className="week-view-event"
                        style={{
                          left: `${layout.left}%`,
                          width: `${layout.width}%`,
                          top: `${layout.top}%`,
                          height: `${layout.height}%`,
                          backgroundColor: color + "20",
                          borderLeftColor: color,
                          color: color,
                        }}
                        onClick={() => handleTaskClick(layout.task)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Úloha: ${layout.task.title}, od ${layout.task.start.toLocaleTimeString("sk-SK", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })} do ${layout.task.end.toLocaleTimeString("sk-SK", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleTaskClick(layout.task);
                          }
                        }}
                      >
                        <div className="week-view-event-title">{layout.task.title}</div>
                        <div className="week-view-event-time">
                          {layout.task.start.toLocaleTimeString("sk-SK", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Current time indicator */}
                {isToday && currentTimePosition && (
                  <div
                    ref={nowIndicatorRef}
                    className="week-view-now-indicator"
                    style={{ top: `${currentTimePosition.top}%` }}
                    role="presentation"
                    aria-label="Aktuálny čas"
                  >
                    <div className="week-view-now-indicator-line" />
                    <div className="week-view-now-indicator-dot" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

