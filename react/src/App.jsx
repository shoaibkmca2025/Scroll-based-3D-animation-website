import useSmoothScroll from './hooks/useSmoothScroll.js';
import useScrollFx from './hooks/useScrollFx.js';
import useMotion from './hooks/useMotion.js';
import Ticker from './components/Ticker.jsx';
import Nav from './sections/Nav.jsx';
import Hero from './sections/Hero.jsx';
import Problem from './sections/Problem.jsx';
import Gate from './sections/Gate.jsx';
import Audiences from './sections/Audiences.jsx';
import Garden from './sections/Garden.jsx';
import Play from './sections/Play.jsx';
import Roles from './sections/Roles.jsx';
import Screens from './sections/Screens.jsx';
import Features from './sections/Features.jsx';
import Onboarding from './sections/Onboarding.jsx';
import Faq from './sections/Faq.jsx';
import Cta from './sections/Cta.jsx';

export default function App() {
  useSmoothScroll();
  useScrollFx();
  useMotion();

  return (
    <div className="cn-page">
      <Nav />
      <Hero />
      <Ticker />
      <Problem />
      <Gate />
      <Audiences />
      <Garden />
      <Play />
      <Roles />
      <Screens />
      <Features />
      <Ticker />
      <Onboarding />
      <Faq />
      <Cta />

      <footer className="cn-footer">
        <div>Grihive — residential society management.</div>
        <div>Clarity in how a community is run.</div>
      </footer>
    </div>
  );
}
