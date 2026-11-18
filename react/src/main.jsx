import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/tokens.css';
import './styles/app.css';

const root = document.getElementById('root');
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);
// The production build ships the page prerendered (prerender.mjs); the dev
// server ships an empty #root.
if (root.firstElementChild) {
  // Paint first, hydrate after: when the script lands before the first
  // frame, hydrating straight away keeps the finished HTML invisible until
  // React has walked the whole page.
  requestAnimationFrame(() => setTimeout(() => hydrateRoot(root, app)));
} else {
  createRoot(root).render(app);
}
