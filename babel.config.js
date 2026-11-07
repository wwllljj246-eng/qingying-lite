module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@app': './src/app',
            '@components': './src/components',
            '@screens': './src/screens',
            '@navigation': './src/navigation',
            '@stores': './src/stores',
            '@services': './src/services',
            '@theme': './src/theme',
            '@constants': './src/constants',
            '@types': './src/types',
            '@utils': './src/utils',
            '@hooks': './src/hooks',
            '@assets': './assets',
          },
        },
      ],
      // react-native-reanimated/plugin must be last
      'react-native-reanimated/plugin',
    ],
  };
};