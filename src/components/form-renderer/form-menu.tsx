"use client";

import * as React from "react";
import { Settings, Sun, Moon, RotateCcw, Check, Monitor, ZoomIn } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const ZOOM_OPTIONS = [
  { value: 50, label: "50%" },
  { value: 80, label: "80%" },
  { value: 90, label: "90%" },
  { value: 100, label: "100% (default)" },
  { value: 110, label: "110%" },
  { value: 120, label: "120%" },
  { value: 150, label: "150%" },
];

interface FormMenuProps {
  onReset: () => void;
}

export function FormMenu({ onReset }: FormMenuProps) {
  const { setTheme, theme } = useTheme();
  const [showResetDialog, setShowResetDialog] = React.useState(false);
  const [zoom, setZoom] = React.useState<number>(100);

  const applyZoom = React.useCallback((level: number) => {
    const container = document.getElementById("form-zoom-container") || document.querySelector("form");
    if (container) {
      (container as HTMLElement).style.zoom = level === 100 ? "" : `${level}%`;
    }
  }, []);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("form_zoom");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && ZOOM_OPTIONS.some((o) => o.value === parsed)) {
          setZoom(parsed);
          applyZoom(parsed);
        }
      }
    } catch {
      // localStorage may be unavailable
    }
  }, [applyZoom]);

  const handleZoomSelect = (newZoom: number) => {
    setZoom(newZoom);
    try {
      if (newZoom === 100) {
        localStorage.removeItem("form_zoom");
      } else {
        localStorage.setItem("form_zoom", newZoom.toString());
      }
    } catch {}
    applyZoom(newZoom);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="rounded-full shadow-sm bg-background/80 backdrop-blur-sm border-border/50 hover:bg-accent">
            <Settings className="h-[1.2rem] w-[1.2rem]" />
            <span className="sr-only">Form options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {/* Appearance Section */}
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Appearance</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setTheme("light")} className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              <span>Light</span>
            </div>
            {theme === "light" && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")} className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4" />
              <span>Dark</span>
            </div>
            {theme === "dark" && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")} className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              <span>System</span>
            </div>
            {theme === "system" && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Zoom Section: placed between appearance and progress */}
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Zoom
          </DropdownMenuLabel>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
              <div className="flex items-center gap-2 flex-1">
                <ZoomIn className="h-4 w-4 text-muted-foreground" />
                <span>{zoom === 100 ? "100% (default)" : `${zoom}%`}</span>
              </div>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-44">
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Zoom Level
              </DropdownMenuLabel>
              {ZOOM_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => handleZoomSelect(opt.value)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <span className={opt.value === zoom ? "font-medium text-foreground" : "text-muted-foreground"}>
                    {opt.label}
                  </span>
                  {zoom === opt.value && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />
          
          {/* Progress Section */}
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progress</DropdownMenuLabel>
          <DropdownMenuItem 
            onClick={(e) => {
              e.preventDefault();
              setShowResetDialog(true);
            }}
            className="text-destructive focus:text-destructive flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset progress</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all answers?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all your progress and reset the form to its initial state. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={onReset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset Answers
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
