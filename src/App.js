import React, { useState, useEffect, useCallback } from 'react';
import { Search, BarChart3, Database, Loader, AlertCircle } from 'lucide-react';

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
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.values || data.values.length === 0) {
        throw new Error('No data found in the sheet');
      }

      const [, ...rows] = data.values;
      const formattedData = rows
        .filter(row => row[0] && row[4]) // Must have Season and Team (column 4)
        .map(row => ({
          season: row[0] || '',        // Season
          division: row[1] || '',      // Div
          position: row[2] || '',      // Pos
          team: row[4] || '',          // Team (skip empty column 3)
          played: row[5] || '',        // P
          won: row[6] || '',           // W
          drawn: row[7] || '',         // D
          lost: row[8] || '',          // L
          goals_for: row[9] || '',     // GF
          goals_against: row[10] || '', // GA
          goal_difference: row[11] || '', // GD
          points: row[12] || '',       // Pts
          start_date: row[13] || '',   // Start date (month)
          start_year: row[14] || '',   // Start date (year)
          manager: row[16] || ''       // Manager
        }));

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
    const filtered = allPositionData.filter(team => {
      const searchLower = searchTerm.toLowerCase().trim();
      const teamName = (team.team || '').toLowerCase();
      const managerName = (team.manager || '').toLowerCase().trim();
      
      // Debug logging to see what we're working with
      if (searchLower === 'holmes' || searchLower === 'frankland') {
        console.log('Searching for:', searchLower);
        console.log('Manager field:', `"${team.manager}"`);
        console.log('Manager cleaned:', `"${managerName}"`);
      }
      
      return teamName.includes(searchLower) || managerName.includes(searchLower);
    });

    // Show some debug info when searching for managers
    if ((searchTerm.toLowerCase().includes('holmes') || searchTerm.toLowerCase().includes('frankland')) && filtered.length === 0) {
      console.log('Manager search debug - first 5 records:');
      allPositionData.slice(0, 5).forEach(team => {
        console.log(`Team: ${team.team}, Manager: "${team.manager}"`);
      });
    }

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



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-purple-900 to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              TOP 100 POSITION ARCHIVE
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
              { id: 'tables', label: 'League Tables', icon: BarChart3 }
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
                placeholder="Search teams or managers (e.g., Liverpool, Frankland, Holmes)..."
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
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Loading Your Archive</h3>
                <p className="text-gray-500 mb-4">Connecting to Google Sheets database...</p>
              </div>
            ) : searchTerm ? (
              <SearchResults />
            ) : (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Search Your Complete Archive</h3>
                <p className="text-gray-500">Search across {allPositionData.length.toLocaleString()} position records from {availableSeasons.length} seasons</p>
                <div className="mt-6 text-sm text-gray-400 space-y-1">
                  <p>Try searching for teams like: <span className="font-mono bg-gray-100 px-2 py-1 rounded">Liverpool</span> <span className="font-mono bg-gray-100 px-2 py-1 rounded">Hamburger SV</span></p>
                  <p>Or managers like: <span className="font-mono bg-gray-100 px-2 py-1 rounded">Holmes</span> <span className="font-mono bg-gray-100 px-2 py-1 rounded">Frankland</span></p>
                </div>
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
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Loading League Data</h3>
                <p className="text-gray-500 mb-4">Connecting to Google Sheets database...</p>
              </div>
            )}
          </div>
        )}




      </div>
    </div>
  );
};

export default ProductionArchive;