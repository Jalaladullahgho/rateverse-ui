/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ألوان الهوية المتناسقة مع شعار Rateverse
        brand: {
          navy:   "#0f1a2b",
          primary:"#5B8CFF",
          violet: "#7A3EFF",
          accent: "#F9C74F",
        },
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15,26,43,0.08)",
        hover:"0 12px 36px rgba(15,26,43,0.12)",
      },
      borderRadius: {
        xl2: "1rem",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)"   },
        },
        "pulse-soft": {
          "0%,100%": { opacity: ".75" },
          "50%":     { opacity: "1"   },
        },
      },
      animation: {
        "fade-in": "fade-in .35s ease-out",
        "pulse-soft": "pulse-soft 1.4s ease-in-out infinite",
      },
    },
  },
  // أبقيْنا فقط line-clamp لأنه موجود عندك ويعمل
 plugins: [require("@tailwindcss/typography")],
};
