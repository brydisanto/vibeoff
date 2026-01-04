import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                gvc: {
                    gold: "#FFE048", // Standard GVC Gold
                    yellow: "#FFE048", // Updated to match gold
                    black: "#050505",
                    dark: "#121212",
                    gray: "#1F1F1F"
                },
                // Keeping neon as legacy or secondary accents if needed, but primarily using gold
                neon: {
                    blue: "#00f3ff",
                    purple: "#bc13fe",
                },
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "conic-gradient": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
            },
            boxShadow: {
                "gold": "0 0 10px rgba(255, 204, 78, 0.3), 0 0 20px rgba(255, 204, 78, 0.1)",
                "neon-blue": "0 0 10px #00f3ff, 0 0 20px #00f3ff",
            },
            fontFamily: {
                sans: ['var(--font-outfit)', 'sans-serif'],
                display: ['var(--font-brice)', 'serif'],  // Changed from Titan to Brice Bold
                cooper: ['var(--font-brice)', 'serif'],
                mundial: ['var(--font-mundial)', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
export default config;
