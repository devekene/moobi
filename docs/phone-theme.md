# Phone theme tokens

The simulated phone owns its appearance independently from the website theme.
`PhoneFrame` scopes the semantic custom properties on `.phone-theme` and sets
`data-phone-theme` to `light` or `dark`. The selected appearance is stored under
`moobi-phone-appearance` in local storage.

Use these properties for shared phone surfaces and new mini apps:

| Token | Use |
| --- | --- |
| `--phone-shell` | Device shell material |
| `--phone-canvas` | Screen background |
| `--phone-surface` | Standard panels and cards |
| `--phone-surface-elevated` | Raised controls and dock surfaces |
| `--phone-text` | Primary text and icons |
| `--phone-text-secondary` | Supporting labels |
| `--phone-text-muted` | Low emphasis text |
| `--phone-border` | Dividers and outlines |
| `--phone-focus` | Keyboard focus indicator |
| `--phone-accent` | Selected controls and highlights |
| `--phone-on-accent` | Text on accent-filled badges and controls |
| `--phone-overlay` | System overlays |

In Tailwind markup, use classes such as
`bg-[var(--phone-surface)] text-[var(--phone-text)]` and
`border-[var(--phone-border)]`. Avoid using `dark:` to theme phone content;
that variant belongs to the website theme.
