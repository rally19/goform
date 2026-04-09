"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  InputGroup,
  InputGroupInput,
  InputGroupButton,
} from "@/components/ui/input-group"

export interface PasswordInputProps
  extends React.ComponentProps<typeof InputGroupInput> {}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)

    return (
      <InputGroup className={cn("h-11", className)}>
        <InputGroupInput
          type={showPassword ? "text" : "password"}
          className="h-full"
          ref={ref}
          {...props}
        />
        <InputGroupButton
          type="button"
          size="icon-sm"
          className="mr-1 h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={() => setShowPassword((prev) => !prev)}
        >
          {showPassword ? (
            <EyeOff className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
          <span className="sr-only">
            {showPassword ? "Hide password" : "Show password"}
          </span>
        </InputGroupButton>
      </InputGroup>
    )
  }
)
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
