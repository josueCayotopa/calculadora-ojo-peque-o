import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { EvaluationProvider } from '@/state/EvaluationContext';
import { HomePage } from '@/pages/HomePage';
import { EvaluationPage } from '@/pages/EvaluationPage';
import { ResultPage } from '@/pages/ResultPage';
import { ComparePage } from '@/pages/ComparePage';
import { AboutPage } from '@/pages/AboutPage';
import { EvidencePage } from '@/pages/EvidencePage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function App() {
  return (
    <EvaluationProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="evaluacion" element={<EvaluationPage />} />
            <Route path="resultado/:ojo" element={<ResultPage />} />
            <Route path="comparar" element={<ComparePage />} />
            <Route path="acerca" element={<AboutPage />} />
            <Route path="evidencia" element={<EvidencePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </EvaluationProvider>
  );
}
