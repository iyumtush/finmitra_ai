/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        "on-background": "var(--on-background)",
        surface: "var(--surface)",
        "on-surface": "var(--on-surface)",
        "surface-bright": "var(--surface-bright)",
        "surface-container-lowest": "var(--surface-container-lowest)",
        "surface-container-low": "var(--surface-container-low)",
        "surface-container": "var(--surface-container)",
        "surface-container-high": "var(--surface-container-high)",
        "surface-container-highest": "var(--surface-container-highest)",
        "on-surface-variant": "var(--on-surface-variant)",
        "outline": "var(--outline)",
        "outline-variant": "var(--outline-variant)",
        primary: "var(--primary)",
        "on-primary": "var(--on-primary)",
        "primary-container": "var(--primary-container)",
        "on-primary-container": "var(--on-primary-container)",
        "primary-fixed": "var(--primary-fixed)",
        "on-primary-fixed": "var(--on-primary-fixed)",
        secondary: "var(--secondary)",
        "on-secondary": "var(--on-secondary)",
        "secondary-container": "var(--secondary-container)",
        "on-secondary-container": "var(--on-secondary-container)",
        "secondary-fixed": "var(--secondary-fixed)",
        "on-secondary-fixed": "var(--on-secondary-fixed)",
        tertiary: "var(--tertiary)",
        "on-tertiary": "var(--on-tertiary)",
        "tertiary-container": "var(--tertiary-container)",
        "on-tertiary-container": "var(--on-tertiary-container)",
        error: "var(--error)",
        "on-error": "var(--on-error)",
        "error-container": "var(--error-container)",
        "on-error-container": "var(--on-error-container)",
      },
      borderRadius: {
        "full": "0.75rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "DEFAULT": "0.125rem"
      },
      spacing: {
        "base": "8px",
        "sm": "12px",
        "gutter": "24px",
        "xs": "4px",
        "xl": "80px",
        "margin-mobile": "16px",
        "md": "24px",
        "lg": "48px",
        "margin-desktop": "40px"
      },
      fontFamily: {
        "display-lg": ["Inter"],
        "label-sm": ["Inter"],
        "body-lg": ["Inter"],
        "title-lg": ["Inter"],
        "headline-lg": ["Inter"],
        "body-sm": ["Inter"],
        "body-md": ["Inter"],
        "headline-md": ["Inter"],
        "headline-lg-mobile": ["Inter"],
        "label-md": ["Inter"]
      },
      fontSize: {
        "display-lg": ["48px", {"fontWeight": "700", "letterSpacing": "-0.02em", "lineHeight": "56px"}],
        "label-sm": ["12px", {"fontWeight": "600", "lineHeight": "16px"}],
        "body-lg": ["18px", {"fontWeight": "400", "lineHeight": "28px"}],
        "title-lg": ["20px", {"fontWeight": "600", "lineHeight": "28px"}],
        "headline-lg": ["32px", {"fontWeight": "600", "letterSpacing": "-0.01em", "lineHeight": "40px"}],
        "body-sm": ["14px", {"fontWeight": "400", "lineHeight": "20px"}],
        "body-md": ["16px", {"fontWeight": "400", "lineHeight": "24px"}],
        "headline-md": ["24px", {"fontWeight": "600", "lineHeight": "32px"}],
        "headline-lg-mobile": ["24px", {"fontWeight": "600", "lineHeight": "32px"}],
        "label-md": ["14px", {"fontWeight": "500", "letterSpacing": "0.01em", "lineHeight": "20px"}]
      }
    }
  },
  plugins: [],
}
