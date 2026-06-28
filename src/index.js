import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import PublicHistoricalStatsArchive from './PublicHistoricalStatsArchive';
import PublicNavTweaks from './PublicNavTweaks';

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
        <div className="bg-white shadow-xl sticky top-0 z-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap gap-3 items-center justify-between">
            <div>
              <div className="font-black text-gray-900">Top 100 Historical Stats</div>
              <div className="text-sm text-gray-500">Malcolm&apos;s predictions, team strength and value added archive</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="#search" className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold text-gray-800">
                Main Archive
              </a>
            </div>
          </div>
        </div>
        <main className="max-w-7xl mx-auto px-6 py-8">
          <PublicHistoricalStatsArchive />
        </main>
      </div>
    );
  }

  return (
    <React.Fragment>
      <PublicNavTweaks />
      <App />
    </React.Fragment>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<RootRouter />);
