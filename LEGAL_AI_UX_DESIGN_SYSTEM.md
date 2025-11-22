# Legal AI UX Design System

## Overview

A unified, human-friendly UX for Legal-AI that combines the warmth of a law library with the functionality of a modern investigation console. This design system prioritizes readability, accessibility, and professional legal workflows.

---

## 1. Visual Language

### Color Palette

**Primary Colors:**
- **Parchment Background**: `#f5f1e8` - Warm, inviting base
- **Deep Burgundy**: `#8b4513` - Harvard law book spine (primary accent)
- **Light Khaki**: `#f0ebe0` - Secondary background
- **Charcoal Text**: `#2c2c2c` - Primary text

**Accent Colors:**
- **Desaturated Green**: `#44ff44` - Status "safe" / operational
- **Amber**: `#ffc107` - Warning / pending
- **Red**: `#ff6b6b` - Danger / critical
- **Tan**: `#d4a574` - Borders and highlights

**Dark Mode (Sidebar):**
- **Charcoal**: `#2c2c2c` - Sidebar background
- **Light Parchment**: `#f5f1e8` - Sidebar text
- **Tan**: `#d4a574` - Sidebar accents

### Typography

**Headers & Titles:**
- Font: `Crimson Text` (serif)
- Usage: Page titles, section headers, statute codes
- Vibe: Law journal, professional, authoritative

**Body & UI:**
- Font: `Source Sans 3` (sans-serif)
- Usage: Body text, UI labels, chat messages
- Fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI'`

**Terminal/Code:**
- Font: `Monaco` or `Courier New` (monospace)
- Usage: Case numbers, statute codes, system status
- Sparingly used for retro elements

### Spacing & Rhythm

- **Base Unit**: 0.75rem (12px)
- **Padding**: 1rem, 1.5rem, 2rem
- **Gap**: 0.5rem, 0.75rem, 1rem, 1.5rem
- **Border Radius**: 4px (sharp), 6px (standard), 20px (pills)

---

## 2. Core Layout: Golden Ratio 3-Column

### Grid Structure

```css
.legal-ai-layout {
  display: grid;
  grid-template-columns: 1fr 2.4fr 1.2fr;
  /* ~20% | ~55% | ~25% */
  min-height: 100vh;
}
```

### Left Sidebar (20-22%)

**Purpose**: Navigation and system status

**Components:**
- Logo & branding
- Navigation menu (6 main items)
- System status strip
- System info (online/offline, GPU, time)

**Navigation Items:**
1. ⚙️ Command Center
2. 📋 Active Cases
3. 🔍 Evidence
4. 📚 Laws & Statutes
5. 📊 Analysis
6. 💬 AI Chat

**Styling:**
- Dark background (`#2c2c2c`)
- Burgundy accents (`#8b4513`)
- Light text (`#f5f1e8`)
- Subtle animations on hover

### Center Main Content (55-60%)

**Purpose**: Primary workspace

**Variations by Page:**
- **Command Center**: Active cases grid, statistics, recent activity
- **Laws Search**: Search bar + statute results + detail panel
- **Case Chat**: Chat interface with summary editor
- **Evidence Board**: Canvas/grid with evidence nodes

**Styling:**
- Parchment background (`#f5f1e8`)
- Generous whitespace
- Clear visual hierarchy
- High readability

### Right Rail (20-25%)

**Purpose**: Context, filters, and system status

**Sections:**
1. **AI Assistant Terminal**
   - Dark background (`#1a1a1a`)
   - Green text (`#44ff44`)
   - Input field for questions

2. **System Status**
   - Database metrics (Postgres, Qdrant, Neo4j)
   - Progress bars with color coding
   - Real-time updates

3. **Quick Actions**
   - New Case
   - Export
   - Settings

**Styling:**
- Light background (`#f0ebe0`)
- Tan borders (`#d4a574`)
- Compact, scannable layout

---

## 3. Component Patterns

### Search & Filters (Hybrid Accordion + Chips)

**Location**: Right rail or dedicated panel

**Structure:**
```
Accordion Groups:
├── Jurisdiction
│   └── Chips: CA, Fed, NY, TX, FL
├── Category
│   └── Chips: Violent, Property, White-Collar, Drug
└── Severity
    └── Chips: Infraction, Misdemeanor, Felony
```

**Behavior:**
- Chips toggle on/off
- Selected state: higher contrast + inner shadow
- "More..." link opens full filter modal
- Clear All button resets filters

**Styling:**
- Chip: `#e0d5c7` background, `#2c2c2c` text
- Active chip: `#8b4513` background, `#f5f1e8` text
- Smooth transitions (150-200ms)

### Evidence Cards (Manila Folder / Polaroid Style)

**Purpose**: Display evidence items on board

**Features:**
- Neutral grid background (pale grey/khaki)
- Color strips for status (unreviewed, flagged, important)
- Dotted connection lines (soft contrast, strong on hover)
- Generous click targets (min 40x40px)

**Actions:**
- Right-click context menu:
  - Open in Panel
  - Send to AI Chat
  - Link to Statute/Citation

### Statute Detail Panel

**Layout:**
- **Left**: Statute list (scrollable)
- **Right**: Full statute text + metadata

**Statute Card:**
- Code (monospace, burgundy)
- Title (serif, bold)
- Badges (jurisdiction, severity)
- Preview text (truncated)

**Detail View:**
- Full statute text (serif, high line-height)
- Metadata grid (jurisdiction, category, severity)
- Related cases / charge bundles
- Actions: Save Citation, Send to Chat, Add as Charge

### AI Chat Interface

**Layout:**
- Header with title and actions
- Disclaimer banner (yellow, always visible)
- Messages container (scrollable)
- Input area (textarea + send button)

**Message Styling:**
- **Prosecutor**: Blue-tinted background
- **AI Assistant**: Tan-tinted background
- **System**: Yellow-tinted background
- Clear role labels with emoji
- Timestamps

**Disclaimer:**
```
⚠️ This assistant cannot determine guilt or innocence.
Verify all outputs against official sources (.gov, DA/AG).
```

---

## 4. Interaction Patterns

### Highlight → Mini-Modal

**Trigger**: User clicks statute, evidence item, or citation

**Behavior:**
- Light card appears near bottom right
- Two primary actions: "Summarize & Save" / "Cancel"
- Non-blocking (doesn't prevent other interactions)
- Async background tasks never block UI

### Chips & Filters

**Visual Feedback:**
- Hover: Slight color shift
- Active: Higher contrast + inner shadow
- Disabled: Greyed out

**Keyboard Support:**
- Tab through chips
- Space/Enter to toggle
- Escape to close filter panel

### Status Indicators

**Color Coding:**
- Green (`#44ff44`): Operational, safe
- Amber (`#ffc107`): Pending, warning
- Red (`#ff6b6b`): Error, critical

**Animations:**
- Pulse effect for status dots
- Smooth transitions (150-200ms)
- No blinking or jarring motion

---

## 5. Accessibility & Comfort

### Contrast

- Body text on parchment: WCAG AA compliant
- Charcoal (`#2c2c2c`) on parchment (`#f5f1e8`): 11.5:1 ratio
- All interactive elements: minimum 4.5:1 ratio

### Motion

- Minimal animations (150-200ms transitions)
- No auto-playing videos or animations
- Respects `prefers-reduced-motion`

### Hit Areas

- Buttons: minimum 40x40px
- Chips: minimum 36x36px
- Evidence nodes: minimum 40x40px

### Keyboard Navigation

- Tab through sidebar → main → filters
- Enter/Space activates chips
- Escape closes modals
- Arrow keys navigate lists

### Typography

- Line-height: 1.4-1.6 for body text
- Font size: minimum 14px for body
- Generous letter-spacing in headers

---

## 6. Responsive Design

### Breakpoints

- **Desktop**: 1024px+ (full 3-column layout)
- **Tablet**: 768px-1023px (2-column, right rail hidden)
- **Mobile**: <768px (1-column, sidebar as drawer)

### Mobile Adjustments

- Sidebar becomes fixed drawer (slides in from left)
- Right rail hidden (accessible via menu)
- Main content takes full width
- Touch-friendly spacing (larger hit areas)

---

## 7. Page-Specific Layouts

### Command Center (`/command-center`)

**Layout:**
- Header with title
- Dashboard grid (auto-fit columns)
- Sections: Active Cases, Recent Activity, Statistics

**Cards:**
- Case cards with status badges
- Activity timeline
- Stat cards with large numbers

### Laws Search (`/laws`)

**Layout:**
- Search bar + filter toggle
- Results grid (2-column on desktop)
- Left: statute list, Right: detail panel

**Features:**
- Hybrid accordion + chips filters
- Statute preview cards
- Full statute detail view
- Related cases sidebar

### Case Chat (`/cases/[id]/chat`)

**Layout:**
- Full-height chat panel
- Disclaimer banner
- Message stream
- Input area

**Features:**
- Role-labeled messages
- Timestamps
- Typing indicator
- Async processing

---

## 8. Color Usage Guidelines

### When to Use Each Color

| Color | Usage | Example |
|-------|-------|---------|
| Burgundy (`#8b4513`) | Primary actions, active states | Buttons, active nav items |
| Tan (`#d4a574`) | Borders, highlights, secondary accents | Card borders, dividers |
| Green (`#44ff44`) | Success, operational status | Status indicator, "online" |
| Amber (`#ffc107`) | Warnings, pending states | Pending badge, caution |
| Red (`#ff6b6b`) | Errors, critical states | Error messages, critical alerts |
| Charcoal (`#2c2c2c`) | Primary text, dark backgrounds | Body text, sidebar |
| Parchment (`#f5f1e8`) | Main background, light text | Page background, light text |

---

## 9. Component Library

### Buttons

```svelte
<!-- Primary -->
<button class="btn-primary">Save Citation</button>

<!-- Secondary -->
<button class="btn-secondary">Cancel</button>

<!-- Tertiary (text-only) -->
<button class="btn-tertiary">Learn More</button>
```

### Badges

```svelte
<!-- Jurisdiction -->
<span class="badge jurisdiction">CA</span>

<!-- Severity -->
<span class="badge severity">Felony</span>

<!-- Status -->
<span class="badge status active">Active</span>
```

### Cards

```svelte
<!-- Statute Card -->
<div class="statute-card">
  <span class="statute-code">42 U.S.C. § 1983</span>
  <span class="statute-title">Civil Rights Action</span>
  <p class="statute-preview">...</p>
</div>

<!-- Case Card -->
<div class="case-card">
  <span class="case-number">CASE-2024-001</span>
  <span class="case-defendant">John Doe</span>
  <div class="case-charges">...</div>
</div>
```

---

## 10. Implementation Checklist

- [x] LegalAILayout component (3-column grid)
- [x] LawsSearchPage component (search + filters + detail)
- [x] CaseChatPanel component (chat interface)
- [x] Command Center page (dashboard)
- [x] Laws page (integrated with layout)
- [x] Case Chat page (integrated with layout)
- [ ] Evidence Board (canvas with nodes)
- [ ] Analysis Center (reports and insights)
- [ ] Settings page (user preferences)
- [ ] Admin panel (system configuration)

---

## 11. Design Tokens

### Spacing

```css
--space-xs: 0.25rem;
--space-sm: 0.5rem;
--space-md: 0.75rem;
--space-lg: 1rem;
--space-xl: 1.5rem;
--space-2xl: 2rem;
```

### Colors

```css
--color-primary: #8b4513;
--color-secondary: #d4a574;
--color-background: #f5f1e8;
--color-background-alt: #f0ebe0;
--color-text: #2c2c2c;
--color-text-light: #666;
--color-border: #d4a574;
--color-success: #44ff44;
--color-warning: #ffc107;
--color-error: #ff6b6b;
```

### Typography

```css
--font-serif: 'Crimson Text', Georgia, serif;
--font-sans: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'Monaco', 'Courier New', monospace;

--font-size-xs: 0.75rem;
--font-size-sm: 0.85rem;
--font-size-base: 0.95rem;
--font-size-lg: 1.1rem;
--font-size-xl: 1.3rem;
--font-size-2xl: 1.5rem;
--font-size-3xl: 2.5rem;
```

---

## 12. Future Enhancements

- Dark mode toggle
- Custom color themes
- Accessibility settings (high contrast, dyslexia-friendly fonts)
- Keyboard shortcuts guide
- Offline mode
- Export/import workflows
- Collaboration features (shared cases, comments)
- Advanced analytics dashboard

---

**Design System Version**: 1.0
**Last Updated**: November 22, 2025
**Status**: Production Ready
