/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Oxanium", "sans-serif"],
        body: ["Space Grotesk", "sans-serif"]
      },
      colors: {
        neon: {
          green: "#22ff88",
          blue: "#33bbff",
          cyan: "#3ef0ff",
          red: "#ff4d6d",
          purple: "#7c8cff"
        },
        night: {
          950: "#030712",
          900: "#071226",
          800: "#10203f"
        }
      },
      boxShadow: {
        glass: "0 12px 32px rgba(10, 20, 50, 0.35)",
        neonGreen: "0 0 24px rgba(34, 255, 136, 0.45)",
        neonBlue: "0 0 24px rgba(51, 187, 255, 0.45)",
        neonRed: "0 0 24px rgba(255, 77, 109, 0.45)"
      },
      backgroundImage: {
        "night-grid":
          "radial-gradient(circle at 20% 20%, rgba(51,187,255,0.12), transparent 38%), radial-gradient(circle at 80% 0%, rgba(34,255,136,0.10), transparent 30%), linear-gradient(145deg, #030712 0%, #071226 45%, #10203f 100%)"
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.6 }
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" }
        }
      },
      animation: {
        pulseGlow: "pulseGlow 2s ease-in-out infinite",
        float: "float 4s ease-in-out infinite"
      }
    }
  },
  plugins: []
};
