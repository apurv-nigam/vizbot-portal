import { cn } from "@/lib/utils";

function Input({ className, type = "text", ...props }) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-[42px] w-full rounded-lg border-[1.5px] border-border bg-white px-3.5 text-lg text-text-primary placeholder:text-text-disabled transition-all duration-200 focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--color-accent-light)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };
