/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#dde6ff",
          200: "#c3d0ff",
          300: "#9eb2ff",
          400: "#7289fa",
          500: "#4f62f5",
          600: "#3b46e8",
          700: "#3036cc",
          800: "#2c30a5",
          900: "#2a2e82",
          950: "#1a1c52",
        },
        accent: {
          50: "#fff8ed",
          100: "#ffefd3",
          200: "#ffdba5",
          300: "#ffc06d",
          400: "#ff9a32",
          500: "#ff7b0a",
          600: "#f55f00",
          700: "#ca4502",
          800: "#a1360b",
          900: "#822f0c",
        },
        success: {
          500: "#22c55e",
          600: "#16a34a",
        },
        danger: {
          500: "#ef4444",
          600: "#dc2626",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Lexend", "Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "bounce-in": "bounceIn 0.4s cubic-bezier(0.68,-0.55,0.27,1.55) forwards",
        "fade-up": "fadeUp 0.3s ease-out forwards",
        "scale-in": "scaleIn 0.2s ease-out forwards",
        "slide-in-right": "slideInRight 0.3s ease-out forwards",
        "pulse-ring": "pulseRing 1.5s ease-out infinite",
        countdown: "countdown linear forwards",
      },
      keyframes: {
        bounceIn: {
          "0%": { transform: "scale(0.3)", opacity: "0" },
          "80%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        fadeUp: {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        pulseRing: {
          "0%": { transform: "scale(1)", opacity: "0.8" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        countdown: {
          "0%": { "stroke-dashoffset": "0" },
          "100%": { "stroke-dashoffset": "283" },
        },
      },
    },
  },
  plugins: [],
};
