import React, { useState, useEffect, useCallback } from 'react';
import { Search, BarChart3, Award, Target, Trophy, Crown, Users, Calendar, Database, Loader, AlertCircle, SortAsc } from 'lucide-react';

const Top100Archive = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('search');
  const [selectedSeason, setSelectedSeason] = useState('25');
  const [selectedDivision, setSelectedDivision] = useState('1');
  const [sortBy, setSortBy] = useState('position');
  const [allPositionData, setAllPositionData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Configuration - Your actual Sheet ID
  const SHEET_ID = process.env.REACT_APP_SHEET_ID || '17-BZlcYuAQCfUV5gxAzS93Dsy6bq8mk_yRat88R5t-w';
  const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY || 'YOUR_API_KEY_HERE';
  const SHEET_RANGE = 'Sorted by team!A:P';

  // Load data from Google Sheets (memoized for a stable reference in useEffect)
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

      // Skip headers row without creating an unused variable
const [headerRow, ...rows] = data.values;

// normalize to compare header texts
const norm = (s) => String(s || '').trim().toLowerCase();
const idx = (names) => {
  const candidates = Array.isArray(names) ? names : [names];
  const i = headerRow.findIndex(h => candidates.includes(norm(h)));
  return i === -1 ? null : i;
};

// columns by header (covers your exact labels)
const cSeason   = idx(['season','seas','s']);
const cDivision = idx(['div','division','d']);
const cPosition = idx(['pos','position','rank']);
const cTeam     = idx(['team','club']);
const cPlayed   = idx(['p','played','pld']);
const cWon      = idx(['w','won']);
const cDrawn    = idx(['d','drawn','draws']);
const cLost     = idx(['l','lost']);
const cGF       = idx(['gf','goals for','for']);
const cGA       = idx(['ga','goals against','against','conceded']);
const cGD       = idx(['gd','goal difference']);
const cPoints   = idx(['pts','points','pnts']);
const cStart    = idx(['start date','start','date']);
const cManager  = idx(['manager','mgr','coach']);

const get = (row, i) => (i == null ? '' : String(row[i] ?? '').trim());

const formattedData = rows
  .filter(row => get(row, cSeason) && get(row, cTeam))
  .map(row => ({
    season:          get(row, cSeason),
    division:        get(row, cDivision),
    position:        get(row, cPosition),
    team:            get(row, cTeam),
    played:          get(row, cPlayed),
    won:             get(row, cWon),
    drawn:           get(row, cDrawn),
    lost:            get(row, cLost),
    goals_for:       get(row, cGF),
    goals_against:   get(row, cGA),
    goal_difference: get(row, cGD),
    points:          get(row, cPoints),
    start_date:      get(row, cStart),
    manager:         get(row, cManager),
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
  }, [API_KEY, SHEET_ID, SHEET_RANGE]);

  // Load once on mount
  useEffect(() => {
    loadFromGoogleSheets();
  }, [loadFromGoogleSheets]);

  // Get data with flexible sorting and filtering
  const getFilteredData = (season = null, division = null, sortOrder = 'position') => {
    let filtered = [...allPositionData];

    // Apply filters
if (season)   filtered = filtered.filter(r => (r.season || '').trim() === (season || '').trim());
if (division) filtered = filtered.filter(r => (r.division || '').trim() === (division || '').trim());
    // Apply sorting
    switch (sortOrder) {
      case 'points':
        return filtered.sort((a, b) => parseInt(b.points || 0) - parseInt(a.points || 0));
      case 'team':
        return filtered.sort((a, b) => a.team.localeCompare(b.team));
      case 'manager':
        return filtered.sort((a, b) => (a.manager || '').localeCompare(b.manager || ''));
      case 'division':
        return filtered.sort((a, b) => {
          const divCompare = parseInt(a.division || 0) - parseInt(b.division || 0);
          return divCompare !== 0 ? divCompare : parseInt(a.position || 0) - parseInt(b.position || 0);
        });
      case 'position':
      default:
        return filtered.sort((a, b) => parseInt(a.position || 0) - parseInt(b.position || 0));
    }
  };

  const getPositionBadge = (position) => {
    const pos = parseInt(position);
    if (pos === 1) return { bg: 'bg-gradient-to-r from-yellow-400 to-yellow-600', text: 'text-white', icon: '👑' };
    if (pos >= 2 && pos <= 4) return { bg: 'bg-gradient-to-r from-green-400 to-green-600', text: 'text-white', icon: '⬆️' };
    if (pos >= 17) return { bg: 'bg-gradient-to-r from-red-400 to-red-600', text: 'text-white', icon: '⬇️' };
    return { bg: 'bg-gray-100', text: 'text-gray-800', icon: '' };
  };

  const getRowStyling = (position) => {
    const pos = parseInt(position);
    if (pos === 1) return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-500';
    if (pos >= 2 && pos <= 4) return 'bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500';
    if (pos >= 17) return 'bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500';
    return 'bg-white hover:bg-gray-50';
  };

  // Available options for dropdowns
  const availableSeasons = [...new Set(allPositionData.map(row => row.season))].sort((a, b) => b.localeCompare(a));
  const availableDivisions = [...new Set(allPositionData.filter(row => row.season === selectedSeason).map(row => row.division))].sort();

  // Search Results Component
  const SearchResults = () => {
    const filtered = allPositionData
      .filter(team =>
        team.team.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (team.manager && team.manager.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => {
        // Sort by season (newest first), then by division, then by position
        const seasonCompare = parseInt(b.season) - parseInt(a.season);
        if (seasonCompare !== 0) return seasonCompare;
        const divCompare = parseInt(a.division) - parseInt(b.division);
        if (divCompare !== 0) return divCompare;
        return parseInt(a.position) - parseInt(b.position);
      });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">Search Results</h3>
            <p className="text-gray-600">{filtered.length} records found across all seasons</p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>Database: {allPositionData.length.toLocaleString()} total records</p>
            <p>Seasons: {availableSeasons.length} available</p>
          </div>
        </div>

        <div className="grid gap-4">
          {filtered.map((team, index) => {
            const badge = getPositionBadge(team.position);
            return (
              <div key={index} className={`${getRowStyling(team.position)} rounded-xl p-6 shadow-lg transition-all hover:shadow-xl`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h4 className="text-xl font-bold text-gray-900">{team.team}</h4>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${badge.bg} ${badge.text}`}>
                        {badge.icon} #{team.position}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Manager</p>
                        <p className="font-semibold">{team.manager || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Season & Division</p>
                        <p className="font-semibold">S{team.season} D{team.division}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Record</p>
                        <p className="font-semibold">{team.won}W {team.drawn}D {team.lost}L</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Goal Difference</p>
                        <p className={`font-semibold ${parseInt(team.goal_difference) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {parseInt(team.goal_difference) > 0 ? '+' : ''}{team.goal_difference}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-3xl font-bold text-blue-600 mb-1">{team.points}</div>
                    <div className="text-sm text-gray-500">points</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Results Found</h3>
            <p className="text-gray-500">Try searching for a different team or manager name</p>
          </div>
        )}
      </div>
    );
  };

  // League Table Component
  const LeagueTable = () => {
    const tableData = getFilteredData(selectedSeason, selectedDivision, sortBy);

    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header with controls */}
        <div className="p-6 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-2xl font-bold">Season {selectedSeason} - Division {selectedDivision}</h3>
              <p className="text-blue-200">Complete League Table ({tableData.length} teams)</p>
              <p className="text-xs text-blue-300 mt-1">Soccer Manager Worlds Top 100 Elite Community</p>
            </div>

            {/* Sort Controls */}
            <div className="flex gap-2 flex-wrap">
              {[
                { id: 'position', label: 'Position', icon: Trophy },
                { id: 'points', label: 'Points', icon: Target },
                { id: 'team', label: 'Team A-Z', icon: SortAsc },
                { id: 'manager', label: 'Manager A-Z', icon: Users }
              ].map(sort => (
                <button
                  key={sort.id}
                  onClick={() => setSortBy(sort.id)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    sortBy === sort.id 
                      ? 'bg-white text-blue-600 shadow-lg' 
                      : 'bg-blue-500 hover:bg-blue-400 text-white'
                  }`}
                >
                  <sort.icon className="w-4 h-4" />
                  {sort.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left py-4 px-4 font-bold text-gray-700">Pos</th>
                <th className="text-left py-4 px-4 font-bold text-gray-700">Team & Manager</th>
                <th className="text-center py-4 px-3 font-bold text-gray-700">P</th>
                <th className="text-center py-4 px-3 font-bold text-green-600">W</th>
                <th className="text-center py-4 px-3 font-bold text-gray-600">D</th>
                <th className="text-center py-4 px-3 font-bold text-red-600">L</th>
                <th className="text-center py-4 px-3 font-bold text-gray-700">GF</th>
                <th className="text-center py-4 px-3 font-bold text-gray-700">GA</th>
                <th className="text-center py-4 px-3 font-bold text-gray-700">GD</th>
                <th className="text-center py-4 px-4 font-bold text-blue-600">Pts</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((team, index) => {
                const badge = getPositionBadge(team.position);
                return (
                  <tr key={index} className={`${getRowStyling(team.position)} border-b border-gray-100 transition-all hover:shadow-md`}>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold ${badge.bg} ${badge.text}`}>
                        {team.position}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-bold text-gray-900 text-lg">{team.team}</div>
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {team.manager || 'Unknown Manager'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center font-semibold">{team.played}</td>
                    <td className="py-4 px-3 text-center font-bold text-green-600">{team.won}</td>
                    <td className="py-4 px-3 text-center font-semibold text-gray-600">{team.drawn}</td>
                    <td className="py-4 px-3 text-center font-bold text-red-600">{team.lost}</td>
                    <td className="py-4 px-3 text-center font-semibold">{team.goals_for}</td>
                    <td className="py-4 px-3 text-center font-semibold">{team.goals_against}</td>
                    <td className={`py-4 px-3 text-center font-bold ${parseInt(team.goal_difference) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {parseInt(team.goal_difference) > 0 ? '+' : ''}{team.goal_difference}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-12 h-8 bg-blue-100 text-blue-800 rounded-lg font-bold">
                        {team.points}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer with legend and stats */}
        <div className="p-6 bg-gray-50 border-t">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-700 mb-2">League Positions</h4>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded"></span>
                  <span>Champions (1st)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-gradient-to-r from-green-400 to-green-600 rounded"></span>
                  <span>Promotion (2nd-4th)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-gradient-to-r from-red-400 to-red-600 rounded"></span>
                  <span>Relegation (17th-20th)</span>
                </div>
              </div>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p className="font-semibold">Current View:</p>
              <p>Sorted by: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}</p>
              <p>Season {selectedSeason} Division {selectedDivision}</p>
              <p>{tableData.length} teams displayed</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Statistics Card Component
  const StatsCard = ({ icon: Icon, title, value, subtitle, color = "blue" }) => (
    <div className={`bg-gradient-to-br from-${color}-50 to-${color}-100 rounded-xl p-6 shadow-lg border border-${color}-200 hover:shadow-xl transition-all`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-${color}-700 text-sm font-semibold uppercase tracking-wide`}>{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {subtitle && <p className={`text-${color}-600 text-sm mt-1`}>{subtitle}</p>}
        </div>
        <Icon className={`w-12 h-12 text-${color}-500`} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-white bg-opacity-10 rounded-full p-4">
                <Trophy className="w-16 h-16 text-yellow-400" />
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-yellow-400 via-blue-300 to-purple-300 bg-clip-text text-transparent">
              TOP 100 ARCHIVE
            </h1>
            <p className="text-xl md:text-2xl text-blue-200 mb-8">
              Soccer Manager Worlds Elite Community • Complete Historical Database
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-8">
              <div className="text-center p-4 bg-white bg-opacity-10 rounded-lg backdrop-blur">
                <div className="text-3xl font-bold text-yellow-400">{availableSeasons.length || '25+'}</div>
                <div className="text-blue-200 text-sm">Seasons</div>
              </div>
              <div className="text-center p-4 bg-white bg-opacity-10 rounded-lg backdrop-blur">
                <div className="text-3xl font-bold text-green-400">5</div>
                <div className="text-blue-200 text-sm">Divisions</div>
              </div>
              <div className="text-center p-4 bg-white bg-opacity-10 rounded-lg backdrop-blur">
                <div className="text-3xl font-bold text-purple-400">{allPositionData.length.toLocaleString() || '2,500+'}</div>
                <div className="text-blue-200 text-sm">Records</div>
              </div>
              <div className="text-center p-4 bg-white bg-opacity-10 rounded-lg backdrop-blur">
                <div className="text-3xl font-bold text-blue-400">100</div>
                <div className="text-blue-200 text-sm">Elite Teams</div>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center justify-center gap-3 text-lg">
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin text-yellow-400" />
                  <span className="text-blue-200">Loading historical data...</span>
                </>
              ) : error ? (
                <>
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-300">Database Error: {error}</span>
                </>
              ) : dataLoaded ? (
                <>
                  <Database className="w-5 h-5 text-green-400" />
                  <span className="text-green-300">✅ Live Database Connected</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <span className="text-yellow-300">⚙️ Setup Required</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

           {/* Navigation */}
      <div className="bg-white shadow-xl sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap gap-2 py-4">
            {[
              { id: 'search', label: 'Search Teams & Managers', icon: Search, color: 'blue' },
              { id: 'tables', label: 'League Tables', icon: BarChart3, color: 'purple' },
              { id: 'statistics', label: 'Community Stats', icon: Award, color: 'green' },
              { id: 'setup', label: 'Setup Guide', icon: Database, color: 'gray' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                  activeTab === tab.id
                    ? `bg-gradient-to-r from-${tab.color}-500 to-${tab.color}-600 text-white shadow-lg`
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
        {/* Enhanced Search Bar */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search teams, managers, or browse complete archives..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                disabled={!dataLoaded}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Season & Division Selectors for Tables */}
            {activeTab === 'tables' && availableSeasons.length > 0 && (
              <>
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="px-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-white"
                >
                  {availableSeasons.map(season => (
                    <option key={season} value={season}>Season {season}</option>
                  ))}
                </select>
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className="px-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-white"
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
              <div className="text-center py-16">
                <div className="bg-white rounded-2xl p-12 shadow-xl max-w-2xl mx-auto">
                  <Database className="w-20 h-20 text-blue-500 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">Setup Your Database Connection</h3>
                  <p className="text-gray-600 mb-6">Configure your Google Sheets API to access 25+ seasons of Top 100 data</p>
                  <button
                    onClick={() => setActiveTab('setup')}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
                  >
                    View Setup Guide
                  </button>
                </div>
              </div>
            ) : searchTerm ? (
              <SearchResults />
            ) : (
              <div className="text-center py-16">
                <div className="bg-white rounded-2xl p-12 shadow-xl max-w-2xl mx-auto">
                  <Search className="w-20 h-20 text-blue-500 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">Search the Complete Archive</h3>
                  <p className="text-gray-600 mb-4">
                    Explore {allPositionData.length.toLocaleString()} position records across {availableSeasons.length} seasons
                  </p>
                  <p className="text-sm text-gray-500">
                    Search by team name, manager name, or browse league tables by season and division
                  </p>
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
              <div className="bg-white rounded-2xl p-16 shadow-xl text-center">
                <Trophy className="w-20 h-20 text-gray-400 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-700 mb-4">Historical League Tables</h3>
                <p className="text-gray-600 mb-6">Connect your Google Sheets database to view complete league tables</p>
                <button
                  onClick={() => setActiveTab('setup')}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
                >
                  Setup Database
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'statistics' && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Community Statistics</h2>
              <p className="text-gray-600 text-lg">Complete overview of the Top 100 Elite Community</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatsCard
                icon={Database}
                title="Data Source"
                value="Google Sheets"
                subtitle={dataLoaded ? "✅ Connected" : "❌ Not connected"}
                color="blue"
              />
              <StatsCard
                icon={Calendar}
                title="Historical Seasons"
                value={availableSeasons.length || 0}
                subtitle="Complete coverage"
                color="green"
              />
              <StatsCard
                icon={Users}
                title="Total Records"
                value={allPositionData.length.toLocaleString() || "0"}
                subtitle="Position entries"
                color="purple"
              />
              <StatsCard
                icon={Trophy}
                title="Database Status"
                value={dataLoaded ? "Live" : "Setup"}
                subtitle={dataLoaded ? "Real-time updates" : "Needs configuration"}
                color="yellow"
              />
            </div>

            {dataLoaded && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Season Breakdown */}
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    Season Breakdown
                  </h3>
                  <div className="space-y-3">
                    {availableSeasons.slice(0, 10).map(season => {
                      const seasonCount = allPositionData.filter(record => record.season === season).length;
                      return (
                        <div key={season} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="font-semibold">Season {season}</span>
                          <span className="text-blue-600 font-bold">{seasonCount} records</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Division Distribution */}
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-500" />
                    Division Distribution
                  </h3>
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(div => {
                      const divCount = allPositionData.filter(record => record.division === div.toString()).length;
                      const percentage = ((divCount / allPositionData.length) * 100).toFixed(1);
                      return (
                        <div key={div} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">Division {div}</span>
                            <span className="text-purple-600 font-bold">{divCount} records ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-purple-400 to-purple-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'setup' && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Setup Guide</h2>
              <p className="text-gray-600 text-lg">Configure your Google Sheets API for live data access</p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-xl">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Database className="w-7 h-7 text-blue-500" />
                Database Configuration Guide
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Step 1 */}
                <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">1</div>
                    <h4 className="font-bold text-blue-800">Google API Setup</h4>
                  </div>
                  <div className="text-sm text-blue-700 space-y-2">
                    <p>• Go to Google Cloud Console</p>
                    <p>• Enable Google Sheets API</p>
                    <p>• Create API credentials</p>
                    <p>• Copy your API key</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-6 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">2</div>
                    <h4 className="font-bold text-green-800">Sheet Configuration</h4>
                  </div>
                  <div className="text-sm text-green-700 space-y-2">
                    <p>✅ Sheet ID configured:</p>
                    <code className="block bg-green-100 p-2 rounded text-xs break-all">
                      17-BZlc...t-w
                    </code>
                    <p>✅ Headers mapped correctly</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-6 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">3</div>
                    <h4 className="font-bold text-purple-800">Environment Setup</h4>
                  </div>
                  <div className="text-sm text-purple-700 space-y-2">
                    <p>Create .env file:</p>
                    <code className="block bg-purple-100 p-2 rounded text-xs">
                      REACT_APP_SHEET_ID=17-BZlc...<br />
                      REACT_APP_GOOGLE_API_KEY=your_key
                    </code>
                  </div>
                </div>
              </div>

              {/* Deployment Steps */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  Deployment Options
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-lg border">
                    <h5 className="font-semibold text-gray-700 mb-2">🚀 Netlify (Recommended)</h5>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>1. Build your project: <code className="bg-gray-100 px-1 rounded">npm run build</code></p>
                      <p>2. Drag build folder to Netlify</p>
                      <p>3. Add environment variables</p>
                      <p>4. Deploy instantly!</p>
                    </div>
                  </div>
                  <div className="p-4 bg-white rounded-lg border">
                    <h5 className="font-semibold text-gray-700 mb-2">⚡ Vercel</h5>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>1. Connect GitHub repository</p>
                      <p>2. Add environment variables</p>
                      <p>3. Deploy automatically</p>
                      <p>4. Share with community!</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Connection */}
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Test Your Connection
                </h4>
                <p className="text-yellow-700 text-sm mb-3">
                  Once configured, click the button below to test your Google Sheets connection:
                </p>
                <button
                  onClick={loadFromGoogleSheets}
                  disabled={loading}
                  className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Testing Connection...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      Test Database Connection
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-slate-800 to-slate-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Trophy className="w-12 h-12 text-yellow-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Soccer Manager Worlds Top 100</h3>
            <p className="text-gray-300 mb-6">Elite Community • Historical Database • 25+ Seasons</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div>
                <h4 className="font-semibold mb-2 text-blue-300">Database Stats</h4>
                <p className="text-sm text-gray-400">
                  {dataLoaded ? `${allPositionData.length.toLocaleString()} records` : 'Setup required'}<br />
                  {availableSeasons.length || '25+'} seasons covered<br />
                  5 competitive divisions
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-green-300">Features</h4>
                <p className="text-sm text-gray-400">
                  Advanced search & filtering<br />
                  Complete league tables<br />
                  Manager tracking<br />
                  Live Google Sheets integration
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-purple-300">Community</h4>
                <p className="text-sm text-gray-400">
                  100 elite managers<br />
                  Historical achievements<br />
                  Performance analytics<br />
                  Professional scouting data
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-700">
              <p className="text-sm text-gray-400">
                Built for the Soccer Manager Worlds Top 100 Community •
                <span className="text-blue-300"> Professional Football Management</span>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Top100Archive;
