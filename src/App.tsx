import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { EvaluationProvider } from '@/state/EvaluationContext';
import { EvaluationPage } from '@/pages/EvaluationPage';
import { ResultPage } from '@/pages/ResultPage';
import { ComparePage } from '@/pages/ComparePage';
import { AboutPage } from '@/pages/AboutPage';
import { EvidencePage } from '@/pages/EvidencePage';
import { NotFoundPage } from '@/pages/NotFoundPage';

/** La calculadora es el inicio; las rutas antiguas /evaluacion redirigen conservando ?ojo=&editar=. */
function RedirigirInicio() {
  const { search } = useLocation();
  return <Navigate to={`/${search}`} replace />;
}

export function App() {
  return (
    <EvaluationProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<EvaluationPage />} />
            <Route path="evaluacion" element={<RedirigirInicio />} />
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
