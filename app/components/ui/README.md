# UI Components - Industrial Military Theme

Reusable UI components following the Faction 01: Industrial Military Human design system.

## Button Component

A military-style button with mechanical states.

### Usage

```tsx
import { Button } from "./components/ui";

// Basic button
<Button state="idle">EXECUTE</Button>

// Armed state with pulse
<Button state="armed" showPulse>WEAPONS ARMED</Button>

// Active targeting state
<Button state="active" variant="targeting" showPulse>TARGET LOCKED</Button>

// Energy variant (amber)
<Button state="armed" variant="energy">REACTOR ONLINE</Button>

// Navigation variant (cyan)
<Button state="active" variant="navigation">NAVIGATION ACTIVE</Button>

// Danger variant (red)
<Button state="active" variant="danger">ABORT</Button>

// Disabled
<Button state="disabled">UNAVAILABLE</Button>

// Cooling down
<Button state="cooling-down">COOLING DOWN...</Button>
```

### Props

- `state`: `"idle" | "armed" | "active" | "disabled" | "cooling-down"`
- `size`: `"sm" | "md" | "lg"` (default: `"md"`)
- `variant`: `"default" | "energy" | "navigation" | "targeting" | "danger"` (default: `"default"`)
- `showPulse`: `boolean` - Enable pulse animation for armed/active states
- `disabled`: `boolean` - Disable button interaction
- Standard button HTML attributes

### States

- **idle**: Default state, steel background, gunmetal border
- **armed**: Amber accent, ready for action
- **active**: Phosphor green accent, currently active
- **disabled**: Muted colors, no interaction
- **cooling-down**: Amber accent, indicates cooldown period

---

## Panel Component

A military-style panel with 2-tone borders and optional effects.

### Usage

```tsx
import { Panel } from "./components/ui";

// Basic panel
<Panel>
  <p>Panel content</p>
</Panel>

// Elevated panel
<Panel elevated>
  <p>Elevated content</p>
</Panel>

// Panel with system label
<Panel systemLabel="SYS-01">
  <p>System panel</p>
</Panel>

// Command panel variant
<Panel variant="command" systemLabel="CMD-01">
  <p>Command panel</p>
</Panel>

// Tactical panel with effects
<Panel 
  variant="tactical" 
  showScanline 
  showFilmGrain
  showNotches
>
  <p>Tactical display</p>
</Panel>
```

### Props

- `variant`: `"default" | "command" | "status" | "tactical"` (default: `"default"`)
- `elevated`: `boolean` - Use elevated background color
- `systemLabel`: `string` - System label (e.g., "SYS-01", "NAV-02")
- `showNotches`: `boolean` - Show corner notches (military hardware look)
- `showFilmGrain`: `boolean` - Add film grain overlay
- `showScanline`: `boolean` - Add CRT scanline overlay
- Standard div HTML attributes

---

## Typography Components

### Heading

All caps, Rajdhani font, bold weight.

```tsx
import { Heading } from "./components/ui";

<Heading level={1}>MAIN TITLE</Heading>
<Heading level={2}>SECTION HEADER</Heading>
<Heading level={3}>SUBSECTION</Heading>
```

### Label

System labels or form labels.

```tsx
import { Label } from "./components/ui";

// System label (monospace, uppercase)
<Label system>SYS-01</Label>

// Regular label
<Label>Ship Name</Label>
```

### Stat

Numbers and statistics (JetBrains Mono).

```tsx
import { Stat } from "./components/ui";

<Stat value={100} unit="HP" />
<Stat value="45%" />
<Stat value={1234} />
```

### Log

Tactical log entries (monospace).

```tsx
import { Log } from "./components/ui";

<Log timestamp>TARGET LOCKED</Log>
<Log>SYSTEM ONLINE</Log>
```

---

## Design Principles

All components follow these principles:

1. **Square corners** - No rounded corners (except optional 2px chamfer)
2. **Functional colors only** - Accents used for meaning, not decoration
3. **Pixel-perfect** - Aligned to 4px grid
4. **Industrial aesthetic** - Heavy, mechanical, mission-critical
5. **No decorative effects** - Only functional feedback (pulse, glow)

---

## Color Usage

- **Phosphor Green** (`#6bff8f`): Targeting, success, locked
- **Amber** (`#ffb84d`): Energy, readiness, cooldown
- **Cyan** (`#56d6ff`): Navigation, movement, sensors
- **Warning Red** (`#ff4d4d`): Damage, danger, critical

---

## Examples

### Command Console

```tsx
<Panel variant="command" systemLabel="CMD-01" showScanline>
  <Heading level={2}>COMMAND CONSOLE</Heading>
  <div className="space-y-4">
    <div>
      <Label system>WPN-01</Label>
      <Stat value={85} unit="%" />
    </div>
    <Button state="armed" variant="targeting" showPulse>
      TARGET LOCKED
    </Button>
    <Button state="idle">EXECUTE</Button>
  </div>
</Panel>
```

### Status Display

```tsx
<Panel variant="status" systemLabel="STS-01">
  <Heading level={3}>SHIP STATUS</Heading>
  <div className="space-y-2">
    <Log timestamp>HULL INTEGRITY: 75%</Log>
    <Log timestamp>SHIELDS: CHARGING</Log>
    <Log timestamp>REACTOR: ONLINE</Log>
  </div>
  <Button state="active" variant="energy">
    REACTOR ONLINE
  </Button>
</Panel>
```
