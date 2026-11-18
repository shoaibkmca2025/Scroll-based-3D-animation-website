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
if (root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);
