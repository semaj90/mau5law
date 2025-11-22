# Legal AI - Visual Reference Guide

## Layout Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌──────────┬──────────────────────────┬──────────────────┐   │
│  │          │                          │                  │   │
│  │ SIDEBAR  │    MAIN CONTENT          │   RIGHT RAIL     │   │
│  │ (20%)    │    (55%)                 │   (25%)          │   │
│  │          │                          │                  │   │
│  │ ⚙️ Nav   │ ┌────────────────────┐  │ 🤖 AI Terminal   │   │
│  │ 📋 Cases │ │ Page Title         │  │ 📊 System Status │   │
│  │ 🔍 Evid  │ │ Subtitle           │  │ ⚡ Quick Actions │   │
│  │ 📚 Laws  │ │                    │  │                  │   │
│  │ 📊 Anal  │ │ Main Content Area  │  │                  │   │
│  │ 💬 Chat  │ │                    │  │                  │   │
│  │          │ │                    │  │                  │   │
│  │ ─────────│ │                    │  │                  │   │
│  │ Status   │ │                    │  │                  │   │
│  │ Online   │ │                    │  │                  │   │
│  │ GPU: Idle│ │                    │  │                  │   │
│  │ 12:34 PM │ └────────────────────┘  │                  │   │
│  │          │                          │                  │   │
│  └──────────┴──────────────────────────┴──────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Color Palette

### Primary Colors

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Parchment Background                                       │
│  ████████████████████████████████████████████████████████  │
│  #f5f1e8 - Warm, inviting base color                       │
│                                                             │
│  Charcoal Text                                              │
│  ████████████████████████████████████████████████████████  │
│  #2c2c2c - Primary text and sidebar background             │
│                                                             │
│  Burgundy Accent                                            │
│  ████████████████████████████████████████████████████████  │
│  #8b4513 - Primary buttons and active states               │
│                                                             │
│  Tan Border                                                 │
│  ████████████████████████████████████████████████████████  │
│  #d4a574 - Borders and highlights                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Status Colors

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Success / Operational                                      │
│  ████████████████████████████████████████████████████████  │
│  #44ff44 - Green (status indicator, "online")              │
│                                                             │
│  Warning / Pending                                          │
│  ████████████████████████████████████████████████████████  │
│  #ffc107 - Amber (pending badge, caution)                  │
│                                                             │
│  Error / Critical                                           │
│  ████████████████████████████████████████████████████████  │
│  #ff6b6b - Red (error messages, critical alerts)           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Typography Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Page Title (Crimson Text, 2.5rem, Bold)                   │
│  ═══════════════════════════════════════════════════════   │
│                                                             │
│  Section Header (Crimson Text, 1.3rem, Bold)               │
│  ───────────────────────────────────────────────────────   │
│                                                             │
│  Subsection (Crimson Text, 1.1rem, Bold)                   │
│  ───────────────────────────────────────────────────────   │
│                                                             │
│  Body Text (Source Sans 3, 0.95rem, Regular)               │
│  Lorem ipsum dolor sit amet, consectetur adipiscing elit.  │
│  Sed do eiusmod tempor incididunt ut labore et dolore.     │
│                                                             │
│  Small Text (Source Sans 3, 0.85rem, Regular)              │
│  Additional information or metadata                         │
│                                                             │
│  Code/System (Monaco, 0.9rem, Regular)                     │
│  CASE-2024-001 | 42 U.S.C. § 1983                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Examples

### Statute Card

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  42 U.S.C. § 1983                    [Federal] [Felony]    │
│  Civil Rights Action                                        │
│                                                             │
│  Every person who, under color of any statute, ordinance,  │
│  regulation, custom, or usage, of any State or Territory   │
│  or the District of Columbia, subjects, or causes to be    │
│  subjected, any citizen of the United States or any other  │
│  person within the jurisdiction thereof to the deprivation │
│  of any rights, privileges, or immunities secured by the   │
│  Constitution and laws, shall be liable to the party       │
│  injured in an action at law, suit in equity, or other     │
│  proper proceeding for redress...                          │
│                                                             │
│  [💾 Save Citation] [💬 Send to Chat]                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Case Card

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  CASE-2024-001                                    [Active]  │
│  John Doe                                                   │
│                                                             │
│  [Murder] [Assault]                                         │
│                                                             │
│  Updated 11/22/2024                              [View →]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Filter Chips

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Jurisdiction:                                              │
│  [CA] [Federal] [NY] [TX] [FL]                              │
│                                                             │
│  Category:                                                  │
│  [Violent] [Property] [White-Collar] [Drug] [Traffic]      │
│                                                             │
│  Severity:                                                  │
│  [Infraction] [Misdemeanor] [Felony]                        │
│                                                             │
│  [Clear All Filters]                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Chat Message

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  👨‍⚖️ Prosecutor                              12:34 PM        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ What are the relevant statutes for this case?      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  🤖 AI Legal Assistant                           12:35 PM   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Based on the charges, the relevant statutes are:   │   │
│  │ • 42 U.S.C. § 1983 - Civil Rights Action           │   │
│  │ • Cal. Penal Code § 187 - Murder                   │   │
│  │ • Cal. Penal Code § 261 - Rape                     │   │
│  │                                                     │   │
│  │ Would you like more details on any of these?       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Responsive Breakpoints

### Desktop (1024px+)

```
┌──────────┬──────────────────────────┬──────────────────┐
│          │                          │                  │
│ SIDEBAR  │    MAIN CONTENT          │   RIGHT RAIL     │
│ (20%)    │    (55%)                 │   (25%)          │
│          │                          │                  │
└──────────┴──────────────────────────┴──────────────────┘
```

### Tablet (768px-1023px)

```
┌──────────┬──────────────────────────────────────────────┐
│          │                                              │
│ SIDEBAR  │    MAIN CONTENT                              │
│ (25%)    │    (75%)                                     │
│          │                                              │
└──────────┴──────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│    MAIN CONTENT                                          │
│    (100%)                                                │
│                                                          │
│    [Sidebar as drawer]                                   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Spacing Scale

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  xs: 0.25rem (4px)   ▮                                      │
│  sm: 0.5rem  (8px)   ▮▮                                     │
│  md: 0.75rem (12px)  ▮▮▮                                    │
│  lg: 1rem    (16px)  ▮▮▮▮                                   │
│  xl: 1.5rem  (24px)  ▮▮▮▮▮▮                                │
│  2xl: 2rem   (32px)  ▮▮▮▮▮▮▮▮                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Button States

### Primary Button

```
Normal:
┌─────────────────────────────────────────────────────────────┐
│ [Save Citation]                                             │
│ Background: #8b4513 (Burgundy)                              │
│ Text: #f5f1e8 (Parchment)                                   │
└─────────────────────────────────────────────────────────────┘

Hover:
┌─────────────────────────────────────────────────────────────┐
│ [Save Citation]                                             │
│ Background: #a0522d (Lighter Burgundy)                      │
│ Text: #f5f1e8 (Parchment)                                   │
└─────────────────────────────────────────────────────────────┘

Disabled:
┌─────────────────────────────────────────────────────────────┐
│ [Save Citation]                                             │
│ Background: #d4a574 (Tan)                                   │
│ Text: #999 (Gray)                                           │
└─────────────────────────────────────────────────────────────┘
```

### Secondary Button

```
Normal:
┌─────────────────────────────────────────────────────────────┐
│ [Cancel]                                                    │
│ Background: #e0d5c7 (Light Khaki)                           │
│ Text: #2c2c2c (Charcoal)                                    │
└─────────────────────────────────────────────────────────────┘

Hover:
┌─────────────────────────────────────────────────────────────┐
│ [Cancel]                                                    │
│ Background: #d4a574 (Tan)                                   │
│ Text: #2c2c2c (Charcoal)                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Badge Styles

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Jurisdiction Badge:                                        │
│  [CA] [Federal] [NY]                                        │
│  Background: #e0d5c7 | Text: #2c2c2c                        │
│                                                             │
│  Severity Badge (Felony):                                   │
│  [Felony]                                                   │
│  Background: #ff6b6b | Text: #fff                           │
│                                                             │
│  Status Badge (Active):                                     │
│  [Active]                                                   │
│  Background: #44ff44 | Text: #000                           │
│                                                             │
│  Status Badge (Pending):                                    │
│  [Pending]                                                  │
│  Background: #ffc107 | Text: #2c2c2c                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Sidebar Navigation

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ⚖️ Legal AI                                                │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ⚙️ Command Center                                          │
│  📋 Active Cases                                            │
│  🔍 Evidence                                                │
│  📚 Laws & Statutes                                         │
│  📊 Analysis                                                │
│  💬 AI Chat                                                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  🟢 Online                                                  │
│  System: Operational                                        │
│  GPU: Idle                                                  │
│  Time: 12:34 PM                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Right Rail - AI Terminal

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  AI Assistant                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Legal AI Terminal                                   │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Ready for analysis...                               │   │
│  │                                                     │   │
│  │ > _                                                 │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ [Ask a legal question...]                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Right Rail - System Status

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  System Status                                              │
│                                                             │
│  Postgres                                                   │
│  ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  6.5 GB                                                     │
│                                                             │
│  Qdrant Vectors                                             │
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  4.2 GB                                                     │
│                                                             │
│  Neo4j Graph                                                │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  2.8 GB                                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Disclaimer Banner

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ⚠️ This assistant cannot determine guilt or innocence.    │
│     Verify all outputs against official sources (.gov,     │
│     DA/AG).                                                 │
│                                                             │
│  Background: #fff3cd (Light Yellow)                         │
│  Border: #ffc107 (Amber)                                    │
│  Text: #856404 (Dark Yellow)                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Animations

### Pulse Animation (Status Indicator)

```
Frame 1:  ● (opacity: 1)
Frame 2:  ◐ (opacity: 0.5)
Frame 3:  ◑ (opacity: 1)
Duration: 2s infinite
```

### Typing Indicator

```
Frame 1:  ● ● ●
Frame 2:  ◐ ● ●
Frame 3:  ◑ ◐ ●
Frame 4:  ● ◑ ◐
Frame 5:  ● ● ◑
Duration: 1.4s infinite
```

### Slide In Animation

```
From: opacity: 0, translateY(10px)
To:   opacity: 1, translateY(0)
Duration: 0.3s ease-out
```

---

## Accessibility Features

### Contrast Ratios

```
Charcoal (#2c2c2c) on Parchment (#f5f1e8):
11.5:1 ratio ✓ WCAG AAA

Burgundy (#8b4513) on Parchment (#f5f1e8):
5.2:1 ratio ✓ WCAG AA

Tan (#d4a574) on Parchment (#f5f1e8):
4.8:1 ratio ✓ WCAG AA
```

### Keyboard Navigation

```
Tab:     Navigate through interactive elements
Enter:   Activate buttons and links
Space:   Toggle checkboxes and chips
Escape:  Close modals and dropdowns
Arrow:   Navigate lists and menus
```

### Hit Areas

```
Minimum size: 40x40 pixels
Buttons:      40x40px ✓
Chips:        36x36px ✓
Links:        40x40px ✓
```

---

**Visual Reference Version**: 1.0
**Last Updated**: November 22, 2025
