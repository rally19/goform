"use client";

import * as React from "react";
import { X, Check, ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { sanitize, stripHtml } from "@/lib/sanitize";

export interface Option {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  accentColor?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options...",
  className,
  accentColor = "#6366f1",
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleUnselect = (value: string) => {
    onChange(selected.filter((s) => s !== value));
  };

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full h-auto min-h-11 justify-between bg-background hover:bg-background/80 transition-all px-3.5 py-2 text-sm md:text-base",
            className
          )}
        >
          <div className="flex flex-wrap gap-1.5 items-center py-0.5">
            {selected.length > 0 ? (
              selected.map((value) => {
                const option = options.find((o) => o.value === value);
                return (
                  <Badge
                    key={value}
                    variant="secondary"
                    className="flex items-center gap-1.5 bg-muted/60 hover:bg-muted px-2.5 py-1 text-xs rounded-md font-normal"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnselect(value);
                    }}
                  >
                    <span className="max-w-[180px] truncate">
                      {stripHtml(option?.label ?? value)}
                    </span>
                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer" />
                  </Badge>
                );
              })
            ) : (
              <span className="text-muted-foreground font-normal">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0" align="start">
        <Command className="w-full">
          <CommandInput placeholder="Search options..." className="h-10 text-sm" />
          <CommandList className="max-h-64 overflow-y-auto p-1.5">
            <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => handleSelect(option.value)}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-md text-sm md:text-[15px]"
                >
                  <div
                    className={cn(
                      "flex h-4.5 w-4.5 items-center justify-center rounded-[4px] border border-primary transition-all shrink-0",
                      selected.includes(option.value)
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}
                    style={selected.includes(option.value) ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div 
                    className="flex-1 prose-sm max-w-full [&_img]:max-h-32 [&_img]:w-auto [&_img]:rounded-md leading-normal"
                    dangerouslySetInnerHTML={{ __html: sanitize(option.label) }}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
