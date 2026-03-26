# Vizbot Design Specification

This document defines the complete visual design system for the Vizbot annotation SaaS app. Every page and component must follow these specifications exactly. The reference mockup is at `docs/vizbot-mockup.html` — open it in a browser and match it precisely.

---

## Design Tokens

### Colors

```
Canvas (page background):     #F5F5F2
Surface (cards, sidebar):     #FFFFFF
Surface hover:                #FAFAF8
Border:                       #E8E8E4
Border hover:                 #D0D0CC

Accent:                       #0F6E56
Accent hover:                 #085041
Accent background:            #E1F5EE
Accent text:                  #0F6E56

Text primary:                 #1A1A1A
Text secondary:               #6B6B6B
Text muted:                   #B0B0A8
Text disabled:                #D0D0CC

Success:                      #16A34A
Success background:           #ECFDF5
Warning:                      #CA8A04
Warning background:           #FEFCE8
Info:                         #2563EB
Info background:              #EFF6FF
Danger:                       #DC2626
Danger background:            #FEF2F2
```

### Asset Type Colors

```
Image:       accent #0F6E56, background #E1F5EE, icon 📷
Video:       accent #2563EB, background #EFF6FF, icon 🎬
Point Cloud: accent #0D9488, background #E6F7F5, icon 🧊
```

### Status Colors

```
Annotated:   text #16A34A, background #ECFDF5
Ready:       text #2563EB, background #EFF6FF
Processing:  text #CA8A04, background #FEFCE8
Uploaded:    text #B0B0A8, background #F5F5F2
```

### Typography

```
Primary font:  'DM Sans', sans-serif  (load from Google Fonts)
Mono font:     'JetBrains Mono', monospace  (load from Google Fonts)

Google Fonts URL:
https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=JetBrains+Mono:wght@400;500;600;700&display=swap

Usage:
- All UI text: DM Sans
- Filenames, code, IDs: JetBrains Mono
- Page titles: 22-24px, weight 700, letter-spacing -0.3px
- Section headers: 18px, weight 700
- Card titles: 15px, weight 620, letter-spacing -0.15px
- Body text: 14px, weight 400
- Small labels: 13px, weight 600
- Tiny labels: 11-12px, weight 500-700
```

### Shadows

```
Resting:  0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)
Hover:    0 10px 32px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.03)
Large:    0 20px 48px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)
Button:   0 1px 2px rgba(91,95,199,0.3)  (primary buttons only)
Focus:    0 0 0 3px #E1F5EE  (input focus ring)
```

### Border Radius

```
Cards, panels:          12px
Inputs, buttons:        8px
Pills, badges, avatars: 9999px (full round)
Sidebar items:          7px
Icon blocks:            10px
Workspace icon:         6px
```

### Transitions

```
Duration:  0.2s for most, 0.25s for cards/sidebar
Easing:    cubic-bezier(0.25, 0.1, 0.25, 1)
```

### Spacing

```
Page padding:           32-36px horizontal, 28-32px vertical
Card internal padding:  22-24px
Sidebar width expanded: 248px
Sidebar width collapsed: 64px
Sidebar padding:        14px 10px
Nav item height:        34px
Input height:           42px
Button heights:         sm=34px, md=40px, lg=48px
```

---

## Layout Architecture

### Page Types

```
Unauthenticated pages (no sidebar):
  - Landing page
  - Onboarding (3 steps)

Authenticated pages (with sidebar):
  - Dashboard
  - Asset Gallery
  - Settings (future)
  - Profile (future)
```

### App Shell (authenticated pages)

```
┌──────────────────────────────────────────────────┐
│ Sidebar (248px)  │  Content (flex: 1)            │
│                  │                                │
│ Logo + toggle    │  Page content here             │
│ Workspace        │  max-width varies by page      │
│ ─────────────    │                                │
│ Dashboard        │                                │
│ Settings         │                                │
│ ─────────────    │                                │
│ PROJECTS         │                                │
│  📷 Project 1   │                                │
│  🎬 Project 2   │                                │
│  🧊 Project 3   │                                │
│                  │                                │
│ ─────────────    │                                │
│ 👤 User + menu  │                                │
└──────────────────────────────────────────────────┘

Collapsed state (64px):
┌─────────────────────────────────────────────────┐
│ [V]  │  Content (flex: 1, gets more space)      │
│ [A]  │                                           │
│ ───  │                                           │
│ [⊞]  │                                           │
│ [⚙]  │                                           │
│ ───  │                                           │
│ [📁] │                                           │
│ [📷] │                                           │
│ [🎬] │                                           │
│      │                                           │
│ ───  │                                           │
│ [AP] │                                           │
│ [▶]  │                                           │
└─────────────────────────────────────────────────┘
```

---

## Component Specifications

### Logo

```
Container: flex row, gap 10px (0 when collapsed)
Icon: 30x30px, border-radius 8px
  Background: linear-gradient(135deg, #0F6E56, #0F6E56)
  Text: "V", white, 14px, weight 800
Label: "Vizbot", 17px, weight 700, color #1A1A1A, letter-spacing -0.5px
  Hidden when sidebar collapsed (opacity 0, transition 0.2s)
```

### Avatar

```
Size: 34px default (30px in sidebar, 22px for workspace icon)
Shape: circle (border-radius 9999px)
Background: linear-gradient(135deg, #0F6E56, #0F6E56)
Text: initials, white, weight 700, size = 38% of container
Hover (when clickable): scale(1.06), transition 0.2s
```

### Button

```
Primary:
  Background: #0F6E56, hover #085041
  Text: white, weight 600
  Shadow: 0 1px 2px rgba(91,95,199,0.3)
  Border: none

Secondary:
  Background: #FFFFFF, hover #FAFAF8
  Text: #1A1A1A, weight 600
  Border: 1px solid #E8E8E4

Ghost:
  Background: transparent, hover #FAFAF8
  Text: #6B6B6B
  Border: none

Disabled:
  Background: #D0D0CC
  Text: white
  Cursor: default

Sizes:
  sm: height 34px, padding 0 14px, font 13px
  md: height 40px, padding 0 18px, font 14px
  lg: height 48px, padding 0 24px, font 15px

All: border-radius 8px, transition 0.2s
```

### Input

```
Height: 42px
Padding: 0 14px
Font: 14px, DM Sans
Background: #FFFFFF
Border: 1.5px solid #E8E8E4
Border (focused): 1.5px solid #0F6E56
Focus ring: box-shadow 0 0 0 3px #E1F5EE
Border-radius: 8px
Placeholder color: #D0D0CC
Transition: all 0.2s

Label above: 13px, weight 600, color #6B6B6B, gap 6px
```

### Card (generic surface)

```
Background: #FFFFFF
Border: 1px solid #E8E8E4
Border-radius: 12px
Shadow (resting): 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)
Padding: 22-24px (varies by usage)

Hover state (when interactive):
  Shadow: 0 10px 32px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.03)
  Transform: translateY(-2px)
  Transition: all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)
```

### Project Card

```
Structure:
  ┌─────────────────────────────┐
  │ [gradient wash on hover]    │  (absolute, top 0, height 70px, pointer-events none)
  │                             │
  │ [icon 40x40] Name      [→] │  (icon scales 1.08 on hover, arrow fades in)
  │              Type label     │
  │                             │
  │ Description (2 line clamp)  │
  │                             │
  │ ─────────────────────────── │  (separator)
  │                             │
  │ 2,450    1,823    [◎ 74%]  │  (stats left, progress pill right)
  │ assets   labeled            │
  └─────────────────────────────┘

Icon block: 40x40px, border-radius 10px, background from asset type config
  Hover: transform scale(1.08), transition 0.25s

Title: 15px, weight 620, color #1A1A1A, hover color #000000
  letter-spacing -0.15px, word-break break-word

Type label: 12px, weight 500, color #B0B0A8

Description: 13px, color #6B6B6B, line-height 1.45
  -webkit-line-clamp: 2

Arrow (→): 16px, color #B0B0A8
  Default: opacity 0, translateX(-6px)
  Hover: opacity 1, translateX(0)
  Transition: all 0.25s

Gradient wash: absolute positioned, top of card
  Default: transparent
  Hover: linear-gradient(180deg, {type-color}08 0%, transparent 100%)

Stats: font 15px weight 650, label 11px weight 500 color #B0B0A8
  Hover: stats color darkens to #000000

Progress pill: flex row, gap 6px, padding 4px 10px 4px 7px
  Border-radius: 9999px
  Background: #F5F5F2 (or #ECFDF5 if complete)
  Contains: ProgressRing (22px SVG) + percentage text (12px, weight 600)
```

### Progress Ring

```
SVG: 22x22px viewBox
Track: circle, stroke #E8E8E4, strokeWidth 2.5, fill none
Progress: circle, stroke = type color (or #16A34A if 100%)
  strokeWidth 2.5, strokeLinecap round
  strokeDasharray = circumference
  strokeDashoffset = circumference - (value/100) * circumference
  transform: rotate(-90deg) from center
  transition: stroke-dashoffset 0.6s ease
Complete (100%): checkmark "✓" text element, fill #16A34A, fontSize 9, weight 700
```

### Sidebar

```
Width expanded: 248px
Width collapsed: 64px
Transition: width 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)
Background: #FFFFFF
Border right: 1px solid #E8E8E4
Padding: 14px 10px
Height: 100vh
Flex direction: column

Sections (top to bottom):
1. Logo + collapse toggle (◀)
   - Collapse button: 26x26px, border-radius 6px, hover background #FAFAF8

2. Workspace switcher
   - Expanded: icon (22x22, border-radius 6px, accent bg) + name + dropdown caret (⌄)
   - Collapsed: icon only (32x32, border-radius 8px, centered)

3. Separator (1px #E8E8E4)

4. Nav links (Dashboard ⊞, Settings ⚙)
   - Height: 34px, border-radius 7px, gap 10px
   - Active: background #E1F5EE, text/icon color #0F6E56, weight 600
   - Hover: background #FAFAF8, text color #1A1A1A
   - Collapsed: icon only, centered, tooltip on hover

5. Separator

6. Projects section
   - Header: "PROJECTS" (11px, weight 700, uppercase, letter-spacing 1px, color #B0B0A8) + "+" button
   - Project items: same as nav items but with type icon and indent 8px
   - Collapsed: type icons only

7. Separator

8. User section (bottom, no flex-grow)
   - Avatar (30px) + name (13px weight 600) + email (11px, color #B0B0A8)
   - Click opens dropdown menu (positioned above, width 190px)
   - Menu items: Profile, Settings, [separator], Log out (color #DC2626, hover bg #FEF2F2)
   - Collapsed: avatar only + expand toggle (▶) below
```

### Asset Thumbnail (Gallery grid item)

```
Structure:
  ┌─────────────────────┐
  │                  [●] │  (status dot, top-right)
  │      [🖼️]           │  (placeholder, height 120px)
  │                     │
  ├─────────────────────┤
  │ IMG_4200.jpg        │  (JetBrains Mono, 12px, weight 500)
  │ [Annotated]  5 lbl  │  (status pill left, label count right)
  └─────────────────────┘

Container: border-radius 12px, overflow hidden
  Hover: same card hover (shadow + translateY -2px)

Thumbnail area: height 120px
  Background: linear-gradient(135deg, #E8E8EC, #D0D0CC)
  Centered placeholder icon at opacity 0.2

Status dot: 8px circle, positioned absolute top 8px right 8px
  Color from status config
  Box-shadow: 0 0 0 2px #FFFFFF (white ring)

Filename: JetBrains Mono, 12px, weight 500, color #1A1A1A
  overflow ellipsis, white-space nowrap

Status pill: 11px, weight 600, padding 2px 7px, border-radius 9999px
  Color and background from status config

Label count: 11px, color #B0B0A8
```

### Upload Zone

```
Border: 2px dashed #E8E8E4 (drag over: 2px dashed #0F6E56)
Border-radius: 12px
Padding: 26px 0
Text align: center
Background: #FFFFFF (drag over: #E1F5EE)
Transition: all 0.2s

Primary text: 14px, color #6B6B6B (drag over: #0F6E56)
  "browse files" link: color #0F6E56, weight 600, cursor pointer
Secondary text: 12px, color #B0B0A8, margin-top 4px
```

### Filter Pills

```
Container: flex row, gap 6px
Pill: padding 5px 13px, border-radius 9999px, font 12px weight 600

Active:
  Background: #E1F5EE
  Color: #0F6E56
  Border: 1px solid rgba(91,95,199,0.25)

Inactive:
  Background: transparent
  Color: #B0B0A8
  Border: 1px solid #E8E8E4
```

### Empty State

```
Container: card, max-width 440px, centered (margin 60px auto 0)
  Padding: 64px 40px
  Text-align: center

Icon: 64x64px, border-radius 16px, background #E1F5EE
  Emoji 28px, centered, margin 0 auto 20px

Title: 18px, weight 700, color #1A1A1A, margin-bottom 8px
Description: 14px, color #6B6B6B, line-height 1.5, margin-bottom 28px
CTA: primary button
```

---

## Screen Specifications

### 1. Landing Page

```
No sidebar. Full width.

Nav: height 64px, max-width 1200px centered
  Left: Logo
  Center: Features, Pricing, Docs (14px, weight 500, color #6B6B6B)
  Right: "Log in" (ghost button) + "Get Started" (primary button, sm)

Hero: max-width 720px, centered, padding-top 100px
  Badge: pill with dot (6px accent circle) + text (13px, weight 600, accent color, accent bg)
  Heading: 52px, weight 800, letter-spacing -1.5px, line-height 1.12
    Second line in accent color
  Subtitle: 18px, color #6B6B6B, line-height 1.6, max-width 520px
  CTAs: "Start Annotating — Free" (primary, lg) + "Watch Demo" (secondary, lg), gap 12px

Asset type cards: 3 columns, max-width 720px, gap 16px
  Each: card with icon block (48x48, radius 12px, type bg) + label + description
```

### 2. Onboarding

```
No sidebar. Centered layout.

Top: Logo at height 56px, left-aligned

Step indicators: centered, flex row, gap 8px
  Step circle: 28x28px, border-radius full
    Active/completed: accent bg, white text
    Completed: shows "✓"
    Inactive: #E8E8E4 bg, #B0B0A8 text
  Step label: 13px, weight 500
    Active: color #1A1A1A
    Inactive: color #B0B0A8
  Connector: 32px wide, 1.5px height
    Completed: accent color
    Incomplete: #E8E8E4

Card: max-width 480px, padding 36px
  Title: 22px, weight 700
  Description: 14px, color #6B6B6B, margin-bottom 28px

  Step 1: Full name input
  Step 2: Workspace name input
  Step 3: Project name input + data type selector (3 cards, 2px border, accent when selected)

  Footer: "Skip for now" / "← Back" (left) + "Continue" / "Create Project" button (right)
    Skip: 13px, color #B0B0A8, cursor pointer
    Back: 13px, color #B0B0A8, cursor pointer
```

### 3. Dashboard

```
With sidebar (AppShell).

Content padding: 32px 36px
Max-width: 1000px

Header: flex space-between
  Left: "Projects" (24px, weight 700) + subtitle (14px, #B0B0A8)
  Right: "Empty state" toggle (secondary, sm) + "+ New Project" (primary, sm)

Project grid: CSS grid
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))
  gap: 14px
  Contains: ProjectCard components

Empty state: centered card (see Empty State component spec)
```

### 4. Asset Gallery

```
With sidebar (AppShell).

Content padding: 28px 36px

Header: flex space-between
  Left: project name (22px, weight 700) + type badge (pill) + stats (14px, #B0B0A8)
  Right: "Export" (secondary, sm) + "+ Upload" (primary, sm)

Upload zone: full width, below header, margin-bottom 24px

Filter pills: below upload zone, margin-bottom 20px

Asset grid: CSS grid
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))
  gap: 12px
  Contains: Asset Thumbnail components
```

---

## Interaction Patterns

### Hover Effects

```
Cards: shadow deepens + translateY(-2px) + gradient wash
Buttons: background color shifts darker
Nav items: background #FAFAF8 + text darkens
Inputs: no hover effect (only focus)
Sidebar items: background #FAFAF8
Avatar: scale(1.06) when clickable
```

### Focus States

```
Inputs: border color #0F6E56 + box-shadow 0 0 0 3px #E1F5EE
Buttons: browser default focus ring (don't override)
```

### Click Feedback

```
Cards: navigate on click (no visual click feedback needed, hover is enough)
Buttons: slight background darken (handled by hover state)
```

### Transitions

```
All transitions: 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)
Card transforms: 0.25s
Sidebar width: 0.25s
Progress ring: 0.6s ease
Gradient wash: 0.3s
Opacity fades: 0.2s
Arrow slide-in: 0.25s
```

---

## Anti-Patterns (NEVER do these)

- Raw unstyled HTML forms or inputs
- Inline styles (use Tailwind classes in the real app)
- Border-heavy designs — use shadows for depth
- Cramped layouts with less than 16px padding inside cards
- Multiple competing accent colors on one screen
- Generic placeholder text like "Coming soon" or "--"
- Empty pages without a designed empty state
- Buttons without hover states
- Inputs without focus rings
- Purple gradients on large surfaces
- System fonts (Inter, Arial, Roboto) — always use DM Sans
- Colored card backgrounds — always white cards on grey canvas
- Hard borders on cards instead of subtle shadow
