import { useAnalysisStore } from './store/analysisStore';
import { UrlForm } from './components/input/UrlForm';
import { AnalysisShell } from './components/AnalysisShell';
import { NorthStarDemo } from './demo/NorthStarDemo';

function isDemoMode() {
  const demo = new URLSearchParams(window.location.search).get('demo');
  return demo === '1' || demo === 'debate';
}

function App() {
  if (isDemoMode()) {
    return <NorthStarDemo />;
  }

  const status = useAnalysisStore((s) => s.status);

  if (status === 'idle') {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <UrlForm />
      </div>
    );
  }

  return <AnalysisShell />;
}

export default App;
