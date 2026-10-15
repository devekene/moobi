# Glass tabs

`components/ui/tabs.tsx` provides a browser tab bar inspired by the supplied
iOS glass reference. It uses phone theme tokens and the existing Radix tabs
primitive for selection, focus, arrow-key navigation, and associated panels.

```tsx
import { Tabs, TabsContent, type TabItem } from "@/components/ui/tabs";
import { LuHouse, LuMail } from "react-icons/lu";

const items: readonly TabItem<"home" | "inbox">[] = [
  { value: "home", label: "Home", icon: <LuHouse /> },
  { value: "inbox", label: "Inbox", icon: <LuMail />, badge: 3 },
];

<Tabs items={items} defaultValue="home" label="Main tabs">
  <TabsContent value="home">Home content</TabsContent>
  <TabsContent value="inbox">Inbox content</TabsContent>
</Tabs>;
```

Each item needs a unique, stable `value`, a visible `label`, and an `icon` React
element. `badge` accepts a number or text; non-positive/non-finite numbers and
empty strings are hidden. Counts above 99 display as `99+` while retaining the
full count in the accessible name. `disabled` marks an unavailable tab.

Use `value` and `onValueChange` for controlled selection. Otherwise, `defaultValue`
or the first enabled item is selected. The callback retains the item value's
TypeScript union, so callers do not need a cast. Supply matching `TabsContent`
panels, or render content from controlled state.

`className` styles the root; `listClassName` positions the pill. Keep the bar
inside the app's safe-area viewport and reserve space for it in the panels.
The pill stays horizontally scrollable when items cannot fit. Selection and
press transitions respect reduced motion. `TabsList`, `TabsTrigger`, and
`TabsContent` remain exported for custom compositions.
