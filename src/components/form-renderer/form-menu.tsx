"use client";

import * as React from "react";
import { Settings, Sun, Moon, RotateCcw, Check, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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

interface FormMenuProps {
  onReset: () => void;
}

export function FormMenu({ onReset }: FormMenuProps) {
  const { setTheme, theme } = useTheme();
  const [showResetDialog, setShowResetDialog] = React.useState(false);

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
