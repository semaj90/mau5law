
// UnoCSS shortcuts for common patterns
export const shortcuts = {
  // Layout shortcuts
  container: "mx-auto px-4 max-w-7xl",
  section: "py-8 md:py-12",

  // Component shortcuts
  btn: "px-4 py-2 rounded-lg font-medium transition-all duration-200",
  "btn-primary": "btn bg-nier-black text-nier-white hover:bg-nier-dark-gray",
  "btn-secondary":
    "btn bg-harvard-crimson text-nier-white hover:bg-harvard-crimson-dark",

  // Form shortcuts
  "form-input":
    "w-full px-3 py-2 bg-white dark:bg-nier-dark-gray border border-nier-light-gray dark:border-nier-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-digital-green",
  "form-label":
    "block text-sm font-medium text-nier-gray dark:text-nier-silver mb-1",

  // Card shortcuts
  "card-base":
    "bg-white dark:bg-nier-black border border-nier-light-gray dark:border-nier-gray rounded-lg shadow-sm",
  "card-hover":
    "transition-all duration-300 hover:shadow-lg hover:border-digital-green",
};
