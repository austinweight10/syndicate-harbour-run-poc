import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AdminShell } from './components/AdminShell.tsx';
import { ArtifactsPage } from './pages/ArtifactsPage.tsx';
import { EventDetailPage } from './pages/EventDetailPage.tsx';
import { EventsPage } from './pages/EventsPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { OverviewPage } from './pages/OverviewPage.tsx';
import { PersonaDetailPage } from './pages/PersonaDetailPage.tsx';
import { PersonasPage } from './pages/PersonasPage.tsx';
import { RunDetailPage } from './pages/RunDetailPage.tsx';
import { RunsPage } from './pages/RunsPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { ShopProvider } from './state/ShopProvider.tsx';

export function App() {
  return (
    <BrowserRouter>
      <ShopProvider>
        <Routes>
          <Route element={<AdminShell />}>
            <Route index element={<OverviewPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="events/:eventId" element={<EventDetailPage />} />
            <Route path="personas" element={<PersonasPage />} />
            <Route path="personas/:personaId" element={<PersonaDetailPage />} />
            <Route path="artifacts" element={<ArtifactsPage />} />
            <Route path="runs" element={<RunsPage />} />
            <Route path="runs/:runId" element={<RunDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </ShopProvider>
    </BrowserRouter>
  );
}
