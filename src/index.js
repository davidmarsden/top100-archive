import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import PublicHistoricalStatsArchive from './PublicHistoricalStatsArchive';
import ArchiveNavigation from './components/ArchiveNavigation';

const getHashRoute = () => window.location.hash.replace('#', '');

const RootRouter = () => {
  const [route, setRoute] = useState(getHashRoute());

  useEffect(() => {
    const onHashChange = () => setRoute(getHashRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (route === 'stats-archive') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="font-black text-gray-900">Top 100 Historical Stats</div>
            <div className="text-sm text-gray-500">Malcolm&apos;s predictions, team strength and value added archive</div>
          </div>
        </div>
        <ArchiveNavigation activeTab="stats-archive" setActiveTab={() => {}} />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <PublicHistoricalStatsArchive />
        </main>
      </div>
    );
  }

  return <App />;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<RootRouter />);
