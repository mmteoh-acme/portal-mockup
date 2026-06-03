"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import "react-day-picker/style.css"

import { cn } from "@/lib/utils"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-3",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1 absolute inset-x-0 top-1 justify-between px-1",
        button_previous:
          "inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-transparent text-sm hover:bg-accent hover:text-accent-foreground",
        button_next:
          "inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-transparent text-sm hover:bg-accent hover:text-accent-foreground",
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday:
          "text-muted-foreground rounded-md w-8 font-mono text-[0.7rem] uppercase tracking-wider",
        week: "flex w-full mt-1",
        day: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 h-8 w-8",
        day_button:
          "inline-flex h-8 w-8 items-center justify-center rounded-md p-0 font-normal hover:bg-accent hover:text-accent-foreground aria-selected:opacity-100",
        range_start:
          "bg-foreground text-background rounded-l-md rounded-r-none",
        range_end:
          "bg-foreground text-background rounded-r-md rounded-l-none",
        range_middle:
          "bg-accent text-accent-foreground rounded-none",
        selected:
          "bg-foreground text-background hover:bg-foreground hover:text-background focus:bg-foreground focus:text-background",
        today: "bg-accent/40 text-accent-foreground",
        outside: "text-muted-foreground/50",
        disabled: "text-muted-foreground/50 opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeftIcon className="size-4" {...chevronProps} />
          ) : (
            <ChevronRightIcon className="size-4" {...chevronProps} />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
