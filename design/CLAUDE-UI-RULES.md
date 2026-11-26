Replace section "### 7. UI" in CLAUDE.md with the block below.

```markdown
### 7. UI — build only from the design kit (src/ui)
- Every screen is assembled from components exported by `@/ui` (src/ui/index.ts). Do not design. Do not style one-off elements in pages.
- Before building any screen, open the closest preview in src/ui/previews/ (Today, Dispatch, Load, Driver) and the pattern table in design/KIT.md (section "Building a new screen"). Copy the structure, change the data.
- Tokens only: theme.css removed Tailwind's default colors, shadows, radii and text sizes on purpose. Never add them back. Never use hex colors, rgb(), inline styles, arbitrary values like text-[13px], gradients, shadows, blur, decorative animation, emoji, or UI libraries (shadcn, Radix, MUI, lucide-react, framer-motion...).
- Never use raw <button>, <input>, <select>, <textarea> or <table> in pages: use Button, Input, Select, Textarea, DataTable. (<input type="file"> for uploads is allowed.)
- One primary button per screen: the next step for the record on screen. Orange (warning) only for problems, always with words.
- Dark mode is the default. Geist for text, Geist Mono for money (Amount, AmountRow).
- One screen per thing: "new" and "edit" share one form. Each role sees only its own menu (src/ui/navigation.ts).
- If a needed component does not exist, STOP and ask the owner. Do not improvise one inside a page.
- `pnpm check:ui` and `pnpm test:visual` must pass. Never update the visual baselines (tests/visual/__baseline__) without the owner's written approval.
- The approved look is shown in design/reference/*.html and design/reference/screenshots/. When unsure how something should look, open those, not your own taste.
```
