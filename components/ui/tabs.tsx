"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export type TabItem<Value extends string = string> = {
  value: Value;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  disabled?: boolean;
};

export type TabsProps<Value extends string = string> = Omit<
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>,
  "value" | "defaultValue" | "onValueChange"
> & {
  items: readonly TabItem<Value>[];
  value?: Value;
  defaultValue?: Value;
  onValueChange?: (value: Value) => void;
  listClassName?: string;
  activeColor?: string;
  label?: string;
};

const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, style, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex max-w-full [scrollbar-width:none] items-stretch gap-1 overflow-x-auto rounded-full border border-[var(--phone-border)] bg-[var(--phone-surface)]/70 text-[var(--phone-text-secondary)] backdrop-blur-[20px] backdrop-saturate-150 [&::-webkit-scrollbar]:hidden",
      "shadow-[0_8px_24px_rgba(0,0,0,0.18),inset_0_1px_0_color-mix(in_srgb,var(--phone-text)_12%,transparent)]",
      className,
    )}
    style={{ padding: 4, ...style }}
    {...props}
  />
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, style, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative flex min-h-[48px] min-w-[44px] flex-1 shrink-0 flex-col items-center justify-center gap-0.5 rounded-full text-[var(--phone-text-secondary)]",
      "transition-[background-color,color,transform] duration-200 enabled:active:scale-[0.96] motion-reduce:transform-none motion-reduce:transition-none",
      "data-[state=active]:bg-[color-mix(in_srgb,var(--phone-text)_12%,transparent)] data-[state=active]:text-[var(--tabs-active-color,var(--phone-accent))]",
      "focus-visible:ring-2 focus-visible:ring-[var(--phone-focus)] focus-visible:outline-none focus-visible:ring-inset disabled:opacity-40",
      className,
    )}
    style={{ paddingBlock: 5, paddingInline: 4, ...style }}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "min-h-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--phone-focus)]",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";

function badgeText(badge: TabItem["badge"]): string | null {
  if (typeof badge === "number") {
    if (!Number.isFinite(badge) || badge <= 0) return null;
    return badge > 99 ? "99+" : String(badge);
  }
  return badge?.trim() || null;
}

function Tabs<Value extends string>({
  items,
  value,
  defaultValue,
  onValueChange,
  listClassName,
  activeColor,
  style,
  label = "App tabs",
  children,
  ...props
}: TabsProps<Value>) {
  const tabStyle: React.CSSProperties & { "--tabs-active-color"?: string } = {
    ...style,
    "--tabs-active-color": activeColor,
  };
  return (
    <TabsPrimitive.Root
      {...props}
      style={tabStyle}
      value={value}
      defaultValue={defaultValue ?? items.find((item) => !item.disabled)?.value}
      onValueChange={(nextValue) => {
        const item = items.find(
          (tab) => tab.value === nextValue && !tab.disabled,
        );
        if (item) onValueChange?.(item.value);
      }}
    >
      {items.length > 0 && (
        <TabsList aria-label={label} className={listClassName}>
          {items.map((item) => {
            const badge = badgeText(item.badge);
            return (
              <TabsTrigger
                key={item.value}
                value={item.value}
                disabled={item.disabled}
                aria-label={badge ? `${item.label}, ${item.badge}` : item.label}
              >
                <span className="relative flex size-[22px] items-center justify-center">
                  <span
                    aria-hidden="true"
                    className="flex size-full items-center justify-center [&>svg]:size-full"
                  >
                    {item.icon}
                  </span>
                  {badge && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--phone-accent)] text-[9px] leading-none font-semibold text-[var(--phone-on-accent)]"
                      style={{ paddingInline: 4 }}
                    >
                      {badge}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate text-[10px] leading-[12px] font-semibold tracking-[-0.1px]">
                  {item.label}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      )}
      {children}
    </TabsPrimitive.Root>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
