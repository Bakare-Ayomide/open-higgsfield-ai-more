export default [
  {
    ignores: [".next/*", "packages/studio/dist/*", "node_modules/*", "dist/*", "release/*", "public/*", "electron/*"]
  },
  {
    files: ["**/*.js", "**/*.jsx", "**/*.mjs"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {}
  }
];
