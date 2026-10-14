"use client";

import type { ComponentProps } from "react";
import { Button, type ButtonVariant } from "./button";

/** A submit button that asks for confirmation before submitting its form. */
export function ConfirmButton({
  message,
  variant = "danger-ghost",
  size = "sm",
  ...props
}: ComponentProps<"button"> & { message: string; variant?: ButtonVariant; size?: "sm" | "md" | "icon" }) {
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      {...props}
    />
  );
}
