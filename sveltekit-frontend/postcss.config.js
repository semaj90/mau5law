export default {
  plugins: {
    '@unocss/postcss': {},
    autoprefixer: {},
    cssnano: process.env.NODE_ENV === 'production' ? {} : false,
  },
};