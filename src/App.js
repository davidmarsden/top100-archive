import React, { useState, useEffect, useCallback } from 'react';
import { Search, BarChart3, Award, Database, Loader, AlertCircle, Calendar, Users, Trophy } from 'lucide-react';

const ProductionArchive = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('search');
  const [selectedSeason, setSelectedSeason] = useState('25');
  const [selectedDivision, setSelectedDivision] = useState('1');
  const [allPositionData, setAllPositionData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Configuration - Your actual Sheet ID
  const SHEET_ID = process.env.REACT_APP_SHEET_ID || '17-BZlcYuAQCfUV5gxAzS93Dsy6bq8mk_yRat88R5t-w';
  const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY || 'AIzaSyCHUgLy0eLZy95K-Anzy7UjPMUNWPZEEho';
  const SHEET_RANGE = 'Sorted by team!A:N';

  // Load data from Google Sheets
  const loadFromGoogleSheets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_RANGE}?key=${API_KEY}`;
      console.log('Fetching from URL:', url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Raw API response:', data);

      if (!data.values || data.values.length === 0) {
        throw new Error('No data found in the sheet');
      }

      const [, ...rows] = data.values;
      const formattedData = rows
        .filter(row => row[0] && row[3])
        .map(row => ({
          season: row[0] || '',
          division: row[1] || '',
          position: row[2] || '',
          team: row[3] || '',
          played: row[4] || '',
          won: row[5] || '',
          drawn: row[6] || '',
          lost: row[7] || '',
          goals_for: row[8] || '',
          goals_against: row[9] || '',
          goal_difference: row[10] || '',
          points: row[11] || '',
          start_date: row[12] || '',
          manager: row[13] || ''
        }));

      console.log('Formatted data:', formattedData);
      setAllPositionData(formattedData);
      setDataLoaded(true);

      const latestSeason = Math.max(...formattedData.map(row => parseInt(row.season) || 0)).toString();
      setSelectedSeason(latestSeason);

    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [SHEET_ID, API_KEY, SHEET_RANGE]);

  useEffect(() => {
    loadFromGoogleSheets();
  }, [loadFromGoogleSheets]);

  const availableSeasons = [...new Set(allPositionData.map(row => row.season))].sort((a, b) => b - a);
  const availableDivisions = [...new Set(allPositionData.filter(row => row.season === selectedSeason).map(row => row.division))].sort();

  const SearchResults = () => {
    const filtered = allPositionData.filter(team => 
      team.team.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (team.manager && team.manager.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">
            Search Results ({filtered.length} found)
          </h3>
          <div className="text-sm text-gray-500">
            Total records: {allPositionData.length.toLocaleString()}
          </div>
        </div>
        
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? `No results found for "${searchTerm}"` : 'Enter a search term above'}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.slice(0, 50).map((team, index) => (
              <div key={index} className="bg-white rounded-lg p-4 shadow border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{team.team}</h4>
                    <p className="text-sm text-gray-600">
                      Season {team.season}, Division {team.division}
                    </p>
                    <p className="text-xs text-gray-500">
                      Manager: {team.manager || 'Unknown'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">#{team.position}</p>
                    <p className="text-sm text-gray-600">{team.points} points</p>
                    <p className="text-xs text-gray-500">
                      {team.won}W {team.drawn}D {team.lost}L
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const DebugInfo = () => (
    <div style={{
      background: 'yellow', 
      padding: '10px', 
      margin: '10px', 
      border: '2px solid red',
      fontSize: '14px'
    }}>
      <h3>Debug Info:</h3>
      <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
      <p><strong>Data Loaded:</strong> {dataLoaded ? 'Yes' : 'No'}</p>
      <p><strong>Error:</strong> {error || 'None'}</p>
      <p><strong>Records Count:</strong> {allPositionData.length}</p>
      <p><strong>API Key Set:</strong> {API_KEY ? `Yes (${API_KEY.substring(0, 10)}...)` : 'No'}</p>
      <p><strong>Sheet ID:</strong> {SHEET_ID ? 'Set' : 'Missing'}</p>
      <p><strong>Available Seasons:</strong> {availableSeasons.join(', ')}</p>
      <p><strong>Available Divisions:</strong> {availableDivisions.join(', ')}</p>

      {allPositionData.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <h4>Sample Data (first 2 records):</h4>
          <pre style={{
            fontSize: '12px', 
            maxHeight: '200px', 
            overflow: 'scroll',
            background: 'white',
            padding: '5px',
            border: '1px solid #ccc'
          }}>
            {JSON.stringify(allPositionData.slice(0, 2), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );

  // Main component return
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800">
      <DebugInfo />
      
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            TOP 100 POSITION ARCHIVE
          </h1>
          <p className="text-xl text-blue-100">
            25 Seasons • Google Sheets Database • Live Updates
          </p>
          
          {/* Stats Display */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">25</div>
              <div className="text-blue-200">Seasons</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">5</div>
              <div className="text-blue-200">Divisions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{allPositionData.length}</div>
              <div className="text-blue-200">Records</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">100</div>
              <div className="text-blue-200">Teams</div>
            </div>
          </div>

          {/* Connection Status */}
          <div className="mt-4">
            {loading ? (
              <div className="text-yellow-200 flex items-center justify-center gap-2">
                <Loader className="animate-spin" size={16} />
                Loading data...
              </div>
            ) : error ? (
              <div className="text-red-200 flex items-center justify-center gap-2">
                <AlertCircle size={16} />
                Connection error
              </div>
            ) : (
              <div className="text-green-200 flex items-center justify-center gap-2">
                <Database size={16} />
                Live data connected
              </div>
            )}
          </div>
        </div>

        {/* Search Interface */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search teams or managers (e.g., Liverpool, Ferguson)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              />
            </div>
          </div>

          <SearchResults />
        </div>
      </div>
    </div>
  );
};

export default ProductionArchive;