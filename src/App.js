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
  const SHEET_RANGE = 'Sorted by team!A:N'; // Updated to include all columns through Manager

  // Load data from Google Sheets
  const loadFromGoogleSheets = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Google Sheets API URL
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_RANGE}?key=${API_KEY}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.values || data.values.length === 0) {
        throw new Error('No data found in the sheet');
      }
      
      // Convert sheet data to match your exact headers
      const [, ...rows] = data.values; // Remove headers variable since we don't use it
      const formattedData = rows
        .filter(row => row[0] && row[3]) // Must have Season and Team
        .map(row => ({
          season: row[0] || '',        // Season
          division: row[1] || '',      // Div
          position: row[2] || '',      // Pos
          team: row[3] || '',          // Team
          played: row[4] || '',        // P
          won: row[5] || '',           // W
          drawn: row[6] || '',         // D
          lost: row[7] || '',          // L
          goals_for: row[8] || '',     // GF
          goals_against: row[9] || '', // GA
          goal_difference: row[10] || '', // GD
          points: row[11] || '',       // Pts
          start_date: row[12] || '',   // Start date
          manager: row[13] || ''       // Manager
        }));
      
      setAllPositionData(formattedData);
      setDataLoaded(true);
      
      // Set default season to latest available
      const latestSeason = Math.max(...formattedData.map(row => parseInt(row.season) || 0)).toString();
      setSelectedSeason(latestSeason);
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [SHEET_ID, API_KEY, SHEET_RANGE]);

  // Load data from Google Sheets on component mount
  useEffect(() => {
    loadFromGoogleSheets();
  }, [loadFromGoogleSheets]);

  // Get data for specific season/division
  const getTableData = (season, division) => {
    return allPositionData
      .filter(row => row.season === season && row.division === division)
      .sort((a, b) => parseInt(a.position) - parseInt(b.position));
  };

  const getRowColor = (position) => {
    const pos = parseInt(position);
    if (pos === 1) return 'bg-yellow-50 border-l-4 border-yellow-400';
    if (pos >= 2 && pos <= 4) return 'bg-green-50 border-l-4 border-green-400';
    if (pos >= 17) return 'bg-red-50 border-l-4 border-red-400';
    return 'bg-white';
  };

  const availableSeasons = [...new Set(allPositionData.map(row => row.season))].sort((a, b) => b - a);
  const availableDivisions = [...new Set(allPositionData.filter(row => row.season === selectedSeason).map(row => row.division))].sort();

  const SearchResults = () => {
  const filtered = allPositionData.filter(team => 
    team.team.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (team.manager && team.manager.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 mb-4">
        Search Results ({filtered.length} found) <span className="float-right">Total records: {allPositionData.length}</span>
      </div>
      
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No results found for "{searchTerm}"
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((team, index) => (
            <div key={index} className="bg-white rounded-lg p-4 shadow border">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">{team.team}</h3>
                  <p className="text-gray-600">Season {team.season}, Division {team.division}, Position {team.position}</p>
                  {team.manager && <p className="text-sm text-gray-500">Manager: {team.manager}</p>}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Points: {team.points}</div>
                  <div className="text-sm text-gray-500">P{team.played} W{team.won} D{team.drawn} L{team.lost}</div>
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
  <div style={{background: 'yellow', padding: '10px', margin: '10px', border: '2px solid red'}}>
    <h3>🐛 Enhanced Debug Info:</h3>
    <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
    <p><strong>Data Loaded:</strong> {dataLoaded ? 'Yes' : 'No'}</p>
    <p><strong>Error:</strong> {error || 'None'}</p>
    <p><strong>Records Count:</strong> {allPositionData.length}</p>
    <p><strong>API Key Set:</strong> {API_KEY ? `Yes (${API_KEY.substring(0, 10)}...)` : 'No'}</p>
    <p><strong>Sheet ID:</strong> {SHEET_ID ? 'Set' : 'Missing'}</p>
    <p><strong>API URL:</strong> {`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_RANGE}?key=${API_KEY.substring(0, 10)}...`}</p>

    {allPositionData.length > 0 && (
      <div>
        <h4>Sample Data (first 2 records):</h4>
        <pre style={{fontSize: '12px', maxHeight: '200px', overflow: 'scroll'}}>
          {JSON.stringify(allPositionData.slice(0, 2), null, 2)}
        </pre>
      </div>
    )}
    
    <div>
      <h4>Available Seasons: {availableSeasons.join(', ')}</h4>
      <h4>Available Divisions: {availableDivisions.join(', ')}</h4>
    </div>
  </div>
);


        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Search Results ({filtered.length} found)</h3>
          <div className="text-sm text-gray-500">
            Total records: {allPositionData.length.toLocaleString()}
          </div>
        </div>
        {filtered.map((team, index) => (
          <div key={index} className="bg-white rounded-lg p-4 shadow border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">{team.team}</h4>
                <p className="text-sm text-gray-600">Season {team.season} Division {team.division}</p>
                <p className="text-xs text-gray-500">Manager: {team.manager || 'Unknown'}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">#{team.position}</p>
                <p className="text-sm text-gray-600">{team.points} points</p>
                <p className="text-xs text-gray-500">{team.won}W {team.drawn}D {team.lost}L</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const LeagueTable = () => {
    const tableData = getTableData(selectedSeason, selectedDivision);
    
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <h3 className="text-xl font-bold">Season {selectedSeason} - Division {selectedDivision}</h3>
          <p className="text-blue-200">Final League Table ({tableData.length} teams)</p>
          <p className="text-xs text-blue-300 mt-1">Data loaded from Google Sheets</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold">Pos</th>
                <th className="text-left py-3 px-4 font-semibold">Team</th>
                <th className="text-left py-3 px-4 font-semibold">Pld</th>
                <th className="text-left py-3 px-4 font-semibold">W</th>
                <th className="text-left py-3 px-4 font-semibold">D</th>
                <th className="text-left py-3 px-4 font-semibold">L</th>
                <th className="text-left py-3 px-4 font-semibold">GF</th>
                <th className="text-left py-3 px-4 font-semibold">GA</th>
                <th className="text-left py-3 px-4 font-semibold">GD</th>
                <th className="text-left py-3 px-4 font-semibold">Pts</th>
                <th className="text-left py-3 px-4 font-semibold">Manager</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((team, index) => (
                <tr key={index} className={`border-b border-gray-100 hover:bg-gray-50 ${getRowColor(team.position)}`}>
                  <td className="py-3 px-4 font-bold">{team.position}</td>
                  <td className="py-3 px-4 font-semibold">{team.team}</td>
                  <td className="py-3 px-4">{team.played}</td>
                  <td className="py-3 px-4 text-green-600">{team.won}</td>
                  <td className="py-3 px-4 text-gray-600">{team.drawn}</td>
                  <td className="py-3 px-4 text-red-600">{team.lost}</td>
                  <td className="py-3 px-4">{team.goals_for}</td>
                  <td className="py-3 px-4">{team.goals_against}</td>
                  <td className={`py-3 px-4 font-semibold ${parseInt(team.goal_difference) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {parseInt(team.goal_difference) > 0 ? '+' : ''}{team.goal_difference}
                  </td>
                  <td className="py-3 px-4 font-bold text-blue-600">{team.points}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{team.manager}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-gray-50 border-t">
          <div className="text-sm text-gray-600 space-y-1">
            <p><span className="inline-block w-4 h-4 bg-yellow-100 rounded mr-2"></span>Champions</p>
            <p><span className="inline-block w-4 h-4 bg-green-100 rounded mr-2"></span>Promotion (positions 2-4)</p>
            <p><span className="inline-block w-4 h-4 bg-red-100 rounded mr-2"></span>Relegation (positions 17-20)</p>
          </div>
        </div>
      </div>
    );
  };

  const StatsCard = ({ icon: Icon, title, value, subtitle }) => (
    <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-blue-500 hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
        </div>
        <Icon className="w-12 h-12 text-blue-500" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-purple-900 to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              📊 TOP 100 POSITION ARCHIVE
            </h1>
            <p className="text-xl md:text-2xl text-blue-200 mb-6">
              25 Seasons • Google Sheets Database • Live Updates
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold">{availableSeasons.length || '25'}</div>
                <div className="text-blue-200">Seasons</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">5</div>
                <div className="text-blue-200">Divisions</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{allPositionData.length.toLocaleString() || '2,500+'}</div>
                <div className="text-blue-200">Records</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">100</div>
                <div className="text-blue-200">Teams</div>
              </div>
            </div>
            
            {/* Status Indicator */}
            <div className="mt-4 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-blue-200">Loading data...</span>
                </>
              ) : error ? (
                <>
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-red-300">Error: {error}</span>
                </>
              ) : dataLoaded ? (
                <>
                  <Database className="w-4 h-4 text-green-400" />
                  <span className="text-green-300">Live data connected</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-300">Configure API keys</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap gap-2 py-4">
            {[
              { id: 'search', label: 'Search Archive', icon: Search },
              { id: 'tables', label: 'League Tables', icon: BarChart3 },
              { id: 'setup', label: 'Setup Guide', icon: Database },
              { id: 'statistics', label: 'Archive Stats', icon: Award }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Search Bar */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search teams, managers, or positions across all seasons..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!dataLoaded}
              />
            </div>
            {activeTab === 'tables' && availableSeasons.length > 0 && (
              <>
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {availableSeasons.map(season => (
                    <option key={season} value={season}>Season {season}</option>
                  ))}
                </select>
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {availableDivisions.map(div => (
                    <option key={div} value={div}>Division {div}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {/* Content Sections */}
        {activeTab === 'search' && (
          <div className="space-y-8">
            {!dataLoaded ? (
              <div className="text-center py-12">
                <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Configure Your Database</h3>
                <p className="text-gray-500 mb-4">Add your Google Sheets API credentials to load data</p>
                <button
                  onClick={() => setActiveTab('setup')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Setup Guide
                </button>
              </div>
            ) : searchTerm ? (
              <SearchResults />
            ) : (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Search Your Complete Archive</h3>
                <p className="text-gray-500">Search across {allPositionData.length.toLocaleString()} position records from {availableSeasons.length} seasons</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tables' && (
          <div className="space-y-6">
            {dataLoaded ? (
              <LeagueTable />
            ) : (
              <div className="bg-white rounded-xl p-12 shadow-lg text-center">
                <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Data Connected</h3>
                <p className="text-gray-500 mb-4">Configure your Google Sheets API to view league tables</p>
                <button
                  onClick={() => setActiveTab('setup')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Setup Guide
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'setup' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Database className="w-6 h-6 text-blue-500" />
                Deployment Setup Guide
              </h2>
              
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-bold text-blue-800 mb-2">📋 Your Sheet Configuration</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-blue-700">✅ Sheet ID: 17-BZlcYuAQCfUV5gxAzS93Dsy6bq8mk_yRat88R5t-w</p>
                    <p className="text-blue-700">✅ Headers mapped: Season, Div, Pos, Team, P, W, D, L, GF, GA, GD, Pts, Start date, Manager</p>
                    <p className="text-blue-700">📝 Next: Add your Google API key in Netlify environment variables</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">Step 1: Netlify Environment Variables</h4>
                    <div className="text-sm text-green-700 space-y-1">
                      <p>In Netlify dashboard, add:</p>
                      <code className="block bg-green-100 p-2 rounded text-xs">
                        REACT_APP_SHEET_ID<br/>
                        = 17-BZlcYuAQCfUV5gxAzS93Dsy6bq8mk_yRat88R5t-w<br/>
                        <br/>
                        REACT_APP_GOOGLE_API_KEY<br/>
                        = your_api_key_here
                      </code>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h4 className="font-semibold text-yellow-800 mb-2">Step 2: Redeploy</h4>
                    <div className="text-sm text-yellow-700 space-y-1">
                      <p>After adding environment variables:</p>
                      <code className="block bg-yellow-100 p-2 rounded text-xs">
                        Go to Deploys tab<br/>
                        Click "Trigger deploy"<br/>
                        Select "Deploy site"
                      </code>
                    </div>
                  </div>
                  
                     <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-purple-800 mb-2">Step 3: Test</h4>
                    <div className="text-sm text-purple-700 space-y-1">
                      <p>Your archive should show:</p>
                      <code className="block bg-purple-100 p-2 rounded text-xs">
                        "Live data connected"<br/>
                        Real season data<br/>
                        Working search
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'statistics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                icon={Database}
                title="Data Source"
                value="Google Sheets"
                subtitle={dataLoaded ? "Connected" : "Not connected"}
              />
              <StatsCard
                icon={Calendar}
                title="Seasons Loaded"
                value={availableSeasons.length || 0}
                subtitle="Historical coverage"
              />
              <StatsCard
                icon={Users}
                title="Total Records"
                value={allPositionData.length.toLocaleString() || "0"}
                subtitle="Position entries"
              />
              <StatsCard
                icon={Trophy}
                title="Status"
                value={dataLoaded ? "Live" : "Setup"}
                subtitle={dataLoaded ? "Real-time data" : "Needs configuration"}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductionArchive;