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
                "primary": "#f48c25",
                "background-light": "#f8f7f5",
                "background-dark": "#221910",
                "slate-card": "#0f172a",
                "slate-border": "#1e293b",
            },
            fontFamily: {
                "sans": ["Inter", "sans-serif"],
                "display": ["Inter", "sans-serif"]
            },
            borderRadius: {
                "lg": "1rem", // 16px
                "xl": "1.5rem", // 24px
            },
        },
    },
    plugins: [],
}
