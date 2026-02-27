module.exports = {
  style: {
    postcss: {
      mode: 'extends',
      loaderOptions: (postcssLoaderOptions, { env, paths }) => {
        postcssLoaderOptions.postcssOptions = {
          plugins: [
            require('tailwindcss'),
            require('autoprefixer'),
          ],
        };
        return postcssLoaderOptions;
      },
    },
  },
  webpack: {
    configure: (webpackConfig) => {
      // Exclude node_modules CSS from PostCSS processing
      const oneOfRule = webpackConfig.module.rules.find((rule) => rule.oneOf);
      if (oneOfRule && oneOfRule.oneOf) {
        oneOfRule.oneOf.forEach((rule) => {
          if (rule.test && rule.test.toString().match(/\.(css|scss|sass)$/)) {
            // Exclude node_modules
            if (!rule.exclude) {
              rule.exclude = /node_modules/;
            } else if (Array.isArray(rule.exclude)) {
              rule.exclude.push(/node_modules/);
            }
          }
        });
      }
      return webpackConfig;
    },
  },
};
