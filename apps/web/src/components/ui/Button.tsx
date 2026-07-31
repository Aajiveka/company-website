import { forwardRef } from 'react';
import { Slot, Slottable } from '@radix-ui/react-slot';
import { type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { buttonVariants } from './button-variants';

/**
 * shadcn/ui structure (cva + Slot + a real focus ring), skinned with the Aajiveka
 * tokens rather than shadcn's neutral palette — same teal/navy/accent as before.
 */

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  /** Render as the child element (e.g. a react-router <Link>) instead of a <button>. */
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, asChild, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {/**
         * Slottable, not a bare {children}. With `asChild`, Slot has to find exactly one
         * element to merge its props onto — and it counts with React.Children.count, which
         * does NOT drop the `undefined` that `isLoading && …` leaves behind when isLoading is
         * unset. So the spinner slot alone made every `asChild` button hand Slot a two-item
         * array and throw "Slot failed to slot onto its children".
         *
         * Slottable marks which child is the target, letting the spinner sit beside it. For a
         * plain <button> it renders its children straight through, so both modes agree.
         */}
        <Slottable>{children}</Slottable>
      </Comp>
    );
  },
);
Button.displayName = 'Button';
