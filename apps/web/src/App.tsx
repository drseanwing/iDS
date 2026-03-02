import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary">OpenGRADE</h1>
        <span className="text-sm text-muted-foreground">v0.1.0-dev</span>
      </header>
      <main className="max-w-4xl mx-auto py-12 px-6">
        <div className="text-center space-y-6">
          <h2 className="text-3xl font-bold tracking-tight">
            Clinical Guideline Authoring Platform
          </h2>
          <p className="text-muted-foreground text-lg">
            FHIR-native, GRADE methodology, living guidelines
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setCount((c) => c + 1)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
            >
              Count: {count}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
