# Animated Theme Toggler

A React component for Next.js that enables smooth theme switching animations using the View Transitions API.

## Features

- **Smooth animations**: Uses View Transitions API for elegant visual transitions
- **Multiple shapes**: 7 different clip-path shapes (circle, square, triangle, diamond, rectangle, hexagon, star)
- **Configurable directions**: 4 directions available (ltr, rtl, ttb, btt)
- **Graceful fallback**: Instant theme switch on unsupported browsers
- **TypeScript**: Fully typed
- **next-themes integration**: Works seamlessly with next-themes

## Basic Usage

### Pre-configured Button

```tsx
import { ThemeToggleButton } from "@/components/theme-toggle-button";

export function Header() {
  return <ThemeToggleButton />;
}
```

### Custom Usage

```tsx
import { ThemeToggleButton } from "@/components/theme-toggle-button";

// With shape and direction
<ThemeToggleButton shape="star" direction="ttb" />
<ThemeToggleButton shape="hexagon" direction="rtl" />
```

### Advanced Usage with Base Component

```tsx
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export function CustomToggle() {
  return (
    <AnimatedThemeToggler shape="diamond" direction="ltr">
      {({ resolvedTheme, toggleTheme }) => (
        <button onClick={(e) => toggleTheme(e)}>
          {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      )}
    </AnimatedThemeToggler>
  );
}
```

## API

### AnimatedThemeToggler Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `(props) => React.ReactNode` | Required | Render prop exposing theme, resolvedTheme and toggleTheme |
| `shape` | `"circle" \| "square" \| "triangle" \| "diamond" \| "rectangle" \| "hexagon" \| "star"` | `"circle"` | Clip-path shape for animation |
| `direction` | `"ltr" \| "rtl" \| "ttb" \| "btt"` | `"ltr"` | Animation direction |
| `className` | `string` | - | Additional CSS classes |

### ThemeToggleButton Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `shape` | Same as above | `"circle"` | Clip-path shape for animation |
| `direction` | Same as above | `"ltr"` | Animation direction |

## Browser Support

- ✅ Chrome 111+, Edge 111+, Opera 97+ (with animation)
- ❌ Firefox, Safari (instant fallback, no animation)

## Demo

Visit `/theme-demo` to see all shape and direction variants in action.

## Technical Details

The component uses the View Transitions API to capture before/after states and animates a clip-path mask. For browsers without support, it falls back to instant theme switching.

```typescript
// Simplified implementation
const transition = document.startViewTransition(() => {
  setTheme(newTheme);
});

transition.ready.then(() => {
  document.documentElement.animate(
    { clipPath: [startClipPath, endClipPath] },
    { duration: 500, pseudoElement: "::view-transition-new(root)" }
  );
});
```
