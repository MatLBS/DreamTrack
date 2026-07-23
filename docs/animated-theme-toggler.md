# Animated Theme Toggler

Un composant React pour Next.js qui permet de changer le thème de l'application avec une animation fluide utilisant l'API View Transitions.

## Fonctionnalités

- **Animations fluides** : Utilise l'API View Transitions pour des transitions visuelles élégantes
- **Plusieurs formes** : Supporte 7 formes différentes (circle, square, triangle, diamond, rectangle, hexagon, star)
- **Directions configurables** : 4 directions disponibles (ltr, rtl, ttb, btt)
- **Fallback gracieux** : Bascule instantanément le thème sur les navigateurs non supportés
- **TypeScript** : Entièrement typé
- **Intégration next-themes** : S'intègre parfaitement avec next-themes

## Installation

Le composant est déjà intégré au projet et utilise les dépendances existantes :

- `next-themes` : Gestion du thème
- `lucide-react` : Icônes

## Utilisation

### Utilisation basique avec le bouton pré-configuré

```tsx
import { ThemeToggleButton } from "@/components/theme-toggle-button";

export function Header() {
  return (
    <header>
      <ThemeToggleButton />
    </header>
  );
}
```

### Utilisation avancée avec personnalisation

```tsx
import { ThemeToggleButton } from "@/components/theme-toggle-button";

export function CustomHeader() {
  return (
    <div>
      {/* Forme étoile avec direction de haut en bas */}
      <ThemeToggleButton shape="star" direction="ttb" />

      {/* Forme hexagone avec direction de droite à gauche */}
      <ThemeToggleButton shape="hexagon" direction="rtl" />
    </div>
  );
}
```

### Utilisation du composant de base pour une UI personnalisée

```tsx
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export function CustomThemeToggle() {
  return (
    <AnimatedThemeToggler shape="diamond" direction="ltr">
      {({ resolvedTheme, toggleTheme }) => (
        <div onClick={(e) => toggleTheme(e)}>
          <span>
            {resolvedTheme === "dark"
              ? "Activer le mode clair"
              : "Activer le mode sombre"}
          </span>
        </div>
      )}
    </AnimatedThemeToggler>
  );
}
```

## Props

### AnimatedThemeToggler

| Prop        | Type                                                                      | Défaut   | Description                                    |
| ----------- | ------------------------------------------------------------------------- | -------- | ---------------------------------------------- |
| `children`  | `(props) => React.ReactNode`                                              | Required | Render prop exposant theme, resolvedTheme et toggleTheme |
| `shape`     | `"circle" \| "square" \| "triangle" \| "diamond" \| "rectangle" \| "hexagon" \| "star"` | `"circle"` | Forme de l'animation clip-path |
| `direction` | `"ltr" \| "rtl" \| "ttb" \| "btt"`                                         | `"ltr"`  | Direction de l'animation (left-to-right, right-to-left, top-to-bottom, bottom-to-top) |
| `className` | `string`                                                                  | -        | Classes CSS additionnelles |

### ThemeToggleButton

| Prop        | Type                                                                      | Défaut   | Description                                    |
| ----------- | ------------------------------------------------------------------------- | -------- | ---------------------------------------------- |
| `shape`     | `"circle" \| "square" \| "triangle" \| "diamond" \| "rectangle" \| "hexagon" \| "star"` | `"circle"` | Forme de l'animation clip-path |
| `direction` | `"ltr" \| "rtl" \| "ttb" \| "btt"`                                         | `"ltr"`  | Direction de l'animation |

## API

### Render prop children

Le composant `AnimatedThemeToggler` expose les propriétés suivantes via sa render prop :

```typescript
{
  theme: string | undefined;          // Thème actuel ('light', 'dark', 'system')
  resolvedTheme: string | undefined; // Thème résolu ('light' ou 'dark')
  toggleTheme: (event?: React.MouseEvent) => void; // Fonction pour changer le thème
}
```

## Compatibilité

### Navigateurs supportés

- ✅ Chrome 111+
- ✅ Edge 111+
- ✅ Opera 97+
- ❌ Firefox (fallback sans animation)
- ❌ Safari (fallback sans animation)

### Fallback

Sur les navigateurs qui ne supportent pas l'API View Transitions, le composant bascule le thème instantanément sans animation.

## Exemples avancés

### Changement de forme au clic

```tsx
import { useState } from "react";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

const shapes = ["circle", "square", "triangle", "diamond", "star"] as const;

export function RotatingShapeToggle() {
  const [shapeIndex, setShapeIndex] = useState(0);

  return (
    <AnimatedThemeToggler shape={shapes[shapeIndex]}>
      {({ resolvedTheme, toggleTheme }) => (
        <button
          onClick={(e) => {
            toggleTheme(e);
            setShapeIndex((prev) => (prev + 1) % shapes.length);
          }}
        >
          {resolvedTheme === "dark" ? "☀️" : "🌙"}
        </button>
      )}
    </AnimatedThemeToggler>
  );
}
```

### Intégration dans une navigation

```tsx
import { ThemeToggleButton } from "@/components/theme-toggle-button";

export function Navigation() {
  return (
    <nav className="flex items-center justify-between p-4">
      <div className="flex gap-4">
        <a href="/">Accueil</a>
        <a href="/about">À propos</a>
      </div>
      <ThemeToggleButton shape="circle" direction="rtl" />
    </nav>
  );
}
```

## Page de démonstration

Visitez `/theme-demo` pour voir toutes les variantes en action.

## Technique

### Comment ça marche

1. **View Transitions API** : Capture l'état avant et après le changement
2. **Clip-path animation** : Anime un masque avec la forme choisie
3. **Calcul du rayon** : Utilise `Math.hypot` pour couvrir tout le viewport
4. **Position dynamique** : Utilise la position du clic ou une position basée sur la direction

### Code simplifié

```typescript
// Calcul du rayon pour couvrir l'écran
const endRadius = Math.hypot(
  Math.max(x, window.innerWidth - x),
  Math.max(y, window.innerHeight - y)
);

// Démarrage de la transition
const transition = document.startViewTransition(() => {
  setTheme(newTheme);
});

// Animation du clip-path
transition.ready.then(() => {
  document.documentElement.animate(
    {
      clipPath: ["circle(0px at " + x + "px " + y + "px)", clipPath],
    },
    {
      duration: 500,
      easing: "ease-in-out",
      pseudoElement: "::view-transition-new(root)",
    }
  );
});
```

## Sources

- [MagicUI Animated Theme Toggler](https://magicui.design/docs/components/animated-theme-toggler)
- [View Transitions API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
