import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../DS/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  docs: {
    autodocs: 'tag'
  },
  viteFinal: async (viteConfig) => {
    viteConfig.optimizeDeps = {
      ...viteConfig.optimizeDeps,
      include: [...(viteConfig.optimizeDeps?.include ?? []), 'react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom/client']
    };
    return viteConfig;
  }
};

export default config;
