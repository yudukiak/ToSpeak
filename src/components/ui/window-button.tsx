import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("w-12 h-full flex justify-center items-center cursor-pointer", {
  variants: {
    variant: {
      default: "hover:bg-gray-700",
      minimize: "hover:bg-gray-700",
      close: "hover:bg-red-700",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const WindowButton = React.forwardRef<HTMLButtonElement, React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>>(({ variant, children, className, ...props }, ref) => {
  return (
    <button ref={ref} data-slot="window-button" className={cn(buttonVariants({ variant, className }))} {...props}>
      {children}
    </button>
  );
});
WindowButton.displayName = "WindowButton";

export { WindowButton };
