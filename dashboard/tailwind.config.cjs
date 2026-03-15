/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "var(--color-primary)",
                "secondary": "var(--color-secondary)",
                "accent": "var(--color-accent)",
                "background-light": "var(--color-background-light)",
                "background-dark": "var(--color-background-dark)",
                "surface-dark": "var(--color-surface-dark)",
                "border-dark": "var(--color-border-dark)",
                "text-primary": "var(--color-text-primary)",
                "text-dark": "var(--color-text-dark)",
                "danger": "var(--color-danger)",
                "warning": "var(--color-warning)",
            },
            fontFamily: {
                "sans": ["var(--font-body)", "sans-serif"],
                "display": ["var(--font-heading)", "sans-serif"]
            },
            borderRadius: {
                "lg": "1rem", // 16px
                "xl": "1.5rem", // 24px
            },
        },
    },
    plugins: [],
}
