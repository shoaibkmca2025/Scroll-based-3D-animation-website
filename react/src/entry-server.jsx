import { renderToString } from 'react-dom/server';
import App from './App.jsx';

// Build-time only: prerender.mjs renders the page with this and writes the
// HTML into dist/index.html.
export const render = () => renderToString(<App />);
