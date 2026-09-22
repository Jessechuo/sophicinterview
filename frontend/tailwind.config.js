// Design tokens copied verbatim from the Google Stitch export so classes match the mock-ups exactly.
/** @type {import("tailwindcss").Config} */
export default {
  "content": [
    "./index.html",
    "./src/**/*.{ts,tsx}"
  ],
  "darkMode": "class",
  "theme": {
    "extend": {
      "colors": {
        "surface-tint": "#0059c7",
        "surface-container-low": "#f1f3fc",
        "on-primary-fixed": "#001a43",
        "surface-container": "#ebeef6",
        "tertiary-fixed-dim": "#6de039",
        "on-tertiary-container": "#f8ffee",
        "surface": "#f8f9ff",
        "surface-container-lowest": "#ffffff",
        "surface-dim": "#d7dae2",
        "tertiary-fixed": "#88fd54",
        "error": "#ba1a1a",
        "tertiary": "#256a00",
        "on-primary-container": "#fefcff",
        "on-tertiary": "#ffffff",
        "on-primary-fixed-variant": "#004398",
        "surface-variant": "#dfe2eb",
        "inverse-primary": "#afc6ff",
        "secondary": "#4d6077",
        "on-secondary-fixed": "#071d31",
        "surface-container-high": "#e5e8f0",
        "on-background": "#181c22",
        "on-tertiary-fixed": "#062100",
        "on-error-container": "#93000a",
        "tertiary-container": "#308600",
        "on-secondary-container": "#51647c",
        "on-surface-variant": "#414755",
        "secondary-container": "#cde1fd",
        "on-secondary": "#ffffff",
        "secondary-fixed-dim": "#b4c8e3",
        "error-container": "#ffdad6",
        "outline-variant": "#c1c6d7",
        "on-primary": "#ffffff",
        "inverse-on-surface": "#eef1f9",
        "primary-container": "#006ef2",
        "on-error": "#ffffff",
        "surface-container-highest": "#dfe2eb",
        "surface-bright": "#f8f9ff",
        "on-secondary-fixed-variant": "#35485e",
        "outline": "#727786",
        "primary-fixed": "#d9e2ff",
        "primary": "#0057c2",
        "on-tertiary-fixed-variant": "#1a5200",
        "on-surface": "#181c22",
        "secondary-fixed": "#d1e4ff",
        "inverse-surface": "#2d3137",
        "background": "#f8f9ff",
        "primary-fixed-dim": "#afc6ff"
      },
      "borderRadius": {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem"
      },
      "spacing": {
        "gutter": "16px",
        "space-sm": "8px",
        "margin": "24px",
        "space-xs": "4px",
        "gutter-lg": "24px",
        "space-lg": "24px",
        "space-xl": "32px",
        "margin-mobile": "12px",
        "space-md": "16px"
      },
      "fontFamily": {
        "card-title": [
          "Inter"
        ],
        "table-cell": [
          "Inter"
        ],
        "page-title": [
          "Inter"
        ],
        "stat-number": [
          "Inter"
        ],
        "body-medium": [
          "Inter"
        ],
        "table-header": [
          "Inter"
        ],
        "body-default": [
          "Inter"
        ],
        "caption": [
          "Inter"
        ],
        "tag-label": [
          "Inter"
        ],
        "stat-number-mobile": [
          "Inter"
        ]
      },
      "fontSize": {
        "card-title": [
          "16px",
          {
            "lineHeight": "24px",
            "fontWeight": "600"
          }
        ],
        "table-cell": [
          "14px",
          {
            "lineHeight": "20px",
            "fontWeight": "400"
          }
        ],
        "page-title": [
          "20px",
          {
            "lineHeight": "28px",
            "fontWeight": "600"
          }
        ],
        "stat-number": [
          "28px",
          {
            "lineHeight": "36px",
            "fontWeight": "600"
          }
        ],
        "body-medium": [
          "14px",
          {
            "lineHeight": "22px",
            "fontWeight": "500"
          }
        ],
        "table-header": [
          "14px",
          {
            "lineHeight": "20px",
            "fontWeight": "500"
          }
        ],
        "body-default": [
          "14px",
          {
            "lineHeight": "22px",
            "fontWeight": "400"
          }
        ],
        "caption": [
          "12px",
          {
            "lineHeight": "18px",
            "fontWeight": "400"
          }
        ],
        "tag-label": [
          "12px",
          {
            "lineHeight": "16px",
            "fontWeight": "500"
          }
        ],
        "stat-number-mobile": [
          "24px",
          {
            "lineHeight": "32px",
            "fontWeight": "600"
          }
        ]
      }
    }
  },
  "plugins": []
};
