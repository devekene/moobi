import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "coverage/**",
      "public/**",
      "next-env.d.ts",
    ],
  },
  ...nextVitals,
  ...nextTypescript,

  {
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "prefer-const": "off",
      "react-hooks/exhaustive-deps": "off",
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;
