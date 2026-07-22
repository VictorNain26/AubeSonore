import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import { AuthInit } from './components/AuthInit';
import { AuthModalHost } from './components/AuthModalHost';
import { NowPlayingPoller } from './components/NowPlayingPoller';
import Layout from './layout/Layout';
import HomePage from './pages/HomePage';
import { PWAInstallBanner } from './components/PWAInstallBanner';

export default function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <AuthInit />
        <NowPlayingPoller />
        <Layout>
          <HomePage />
        </Layout>
        <AuthModalHost />
        <PWAInstallBanner />
      </MotionConfig>
    </LazyMotion>
  );
}
