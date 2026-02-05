/**
 * Inline script that runs before paint to apply the correct theme class,
 * preventing flash of wrong theme (FOUC) on page load.
 */
export function ThemeScript() {
  const script = `
    (function() {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      }
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}
