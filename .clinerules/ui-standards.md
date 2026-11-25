
# LiteBox Desktop UI Standards (Always Enforce)

## Component & Layout Rules

- Use `shadcn/ui` primitives in `src/renderer/components/ui/` (`Button`, `Input`, `Select`, `Switch`, `Tabs`, `Dialog`, `Tooltip`, `Badge`). Never hand-roll raw styled `<button>` or `<input>` elements when a primitive exists.
- Design for a compact desktop utility (`Operate` mode: dense, crisp, native Windows feel; no marketing gradients, no decorative hero blurbs, no oversized padding).
- Use `gap-*` on flex/grid containers. Never use `space-x-*` or `space-y-*`.
- Use semantic design tokens (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`) so Dark, Light, and System themes work automatically with zero manual `dark:` color overrides.

## Anti-Floppy-Button Guardrails

- Standardize control heights: `h-8` (32px) for compact toolbars/table actions, `h-9` (36px) for primary modal buttons and form inputs. Never mix random vertical paddings on the same row.
- Every button containing text MUST include `whitespace-nowrap shrink-0` so labels never wrap onto two lines or squash horizontally.
- Every icon-only button MUST be an explicit square (`h-8 w-8 p-0` or `size="icon"`) with a centered `16px` (`h-4 w-4`) icon and a `Tooltip` + `aria-label`.
- Every flex child containing dynamic text (profile names, SSH hosts, exit IPs, URLs) MUST include `min-w-0 truncate` so long hostnames never push action buttons off-screen.
- Keep modal widths fixed and predictable (`max-w-lg` for forms, `max-w-2xl` for Proxy/SSH Manager) with a pinned header, scrollable body (`max-h-[70vh] overflow-y-auto`), and pinned right-aligned footer (`Cancel` on left, primary action on right).

## Visual Verification Before Finishing a UI Sub-Phase

- Before marking any UI sub-phase complete, inspect the rendered shell at both `900x600` (minimum window size) and `1280x840` using Playwright MCP (screenshot + overflow check) to confirm zero clipped text, zero horizontal scrollbars, and aligned button rows.
- Run the `web-design-guidelines` skill audit on modified files under `src/renderer/`.
