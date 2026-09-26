import { StrictMode, type ComponentProps } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import '@shopify/polaris/build/esm/styles.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import { PolarisLink } from './shopify/PolarisLink.tsx';
import { App } from './App.tsx';
import './styles/admin.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element missing');
}

createRoot(root).render(
  <StrictMode>
    <AppProvider
      i18n={enTranslations}
      linkComponent={PolarisLink as NonNullable<ComponentProps<typeof AppProvider>['linkComponent']>}
    >
      <App />
    </AppProvider>
  </StrictMode>,
);
