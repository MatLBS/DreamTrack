import { ThemeToggleButton } from "@/components/theme-toggle-button";

export default function ThemeDemoPage() {
  return (
    <div className="container mx-auto p-8 space-y-12">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold">Animated Theme Toggler Demo</h1>
        <p className="text-muted-foreground">
          Cliquez sur les boutons ci-dessous pour voir les différentes
          animations de changement de thème.
        </p>
      </div>

      <div className="grid gap-8">
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Formes (Shapes)</h2>
          <p className="text-sm text-muted-foreground">
            Différentes formes d&apos;animation avec direction par défaut (ltr)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col items-center gap-2">
              <ThemeToggleButton shape="circle" />
              <span className="text-sm font-medium">Circle</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ThemeToggleButton shape="square" />
              <span className="text-sm font-medium">Square</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ThemeToggleButton shape="triangle" />
              <span className="text-sm font-medium">Triangle</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ThemeToggleButton shape="diamond" />
              <span className="text-sm font-medium">Diamond</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ThemeToggleButton shape="rectangle" />
              <span className="text-sm font-medium">Rectangle</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ThemeToggleButton shape="hexagon" />
              <span className="text-sm font-medium">Hexagon</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ThemeToggleButton shape="star" />
              <span className="text-sm font-medium">Star</span>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Directions</h2>
          <p className="text-sm text-muted-foreground">
            Différentes directions d&apos;animation (forme: circle)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col items-center gap-2">
              <ThemeToggleButton shape="circle" direction="ltr" />
              <span className="text-sm font-medium">Left to Right</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ThemeToggleButton shape="circle" direction="rtl" />
              <span className="text-sm font-medium">Right to Left</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ThemeToggleButton shape="circle" direction="ttb" />
              <span className="text-sm font-medium">Top to Bottom</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ThemeToggleButton shape="circle" direction="btt" />
              <span className="text-sm font-medium">Bottom to Top</span>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Compatibilité</h2>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-sm text-muted-foreground">
              Ce composant utilise l&apos;API View Transitions qui est supportée
              par les navigateurs modernes basés sur Chromium. Sur les
              navigateurs qui ne supportent pas cette API (comme Firefox), le
              changement de thème se fait instantanément sans animation.
            </p>
            <ul className="text-sm space-y-1">
              <li>✅ Chrome 111+</li>
              <li>✅ Edge 111+</li>
              <li>✅ Opera 97+</li>
              <li>❌ Firefox (animation désactivée)</li>
              <li>❌ Safari (animation désactivée)</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
