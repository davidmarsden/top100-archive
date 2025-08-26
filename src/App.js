import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  BarChart3,
  Award,
  Target,
  Trophy,
  Users,
  Calendar,
  Database,
  Loader,
  AlertCircle,
  SortAsc,
} from 'lucide-react';

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

  // === Config (env required in CI) ===
  const SHEET_ID = process.env.REACT_APP_SHEET_ID;
  const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
  const SHEET_RANGE = 'Sorted by team!A:R';

  // === Data loading (memoized) ===
  const loadFromGoogleSheets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!SHEET_ID) throw new Error('Missing REACT_APP_SHEET_ID (Netlify → Environment).');
      if (!API_KEY) throw new Error('Missing REACT_APP_GOOGLE_API_KEY (Netlify → Environment).');

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        SHEET_ID
      )}/values/${encodeURIComponent(SHEET_RANGE)}?key=${encodeURIComponent(API_KEY)}`;

      const response = await fetch(url);
      if (!response.ok) {
        let details = '';
        try {
          const j = await response.json();
          details = j?.error?.message ? ` - ${j.error.message}` : '';
        } catch (_) {}
        throw new Error(`API Error: ${response.status}${details}`);
      }

      const data = await response.json();
      if (!data.values || data.values.length === 0) {
        throw new Error('No data found in the sheet');
      }

      const [headerRow, ...rows] = data.values;

      // Header-name mapping (robust to order / blank columns)
      const norm = (s) => String(s || '').trim().toLowerCase();
      const idx = (names) => {
        const candidates = Array.isArray(names) ? names : [names];
        const i = headerRow.findIndex((h) => candidates.includes(norm(h)));
        return i === -1 ? null : i;
      };

      const cSeason = idx(['season', 'seas', 's']);
      const cDivision = idx(['div', 'division', 'd']);
      const cPosition = idx(['pos', 'position', 'rank']);
      const cTeam = idx(['team', 'club']);
      const cPlayed = idx(['p', 'played', 'pld']);
      const cWon = idx(['w', 'won']);
      const cDrawn = idx(['d', 'drawn', 'draws']);
      const cLost = idx(['l', 'lost']);
      const cGF = idx(['gf', 'goals for', 'for']);
      const cGA = idx(['ga', 'goals against', 'against', 'conceded']);
      const cGD = idx(['gd', 'goal difference']);
      const cPoints = idx(['pts', 'points', 'pnts']);
      const cStart = idx(['start date', 'start', 'date']);
      const cManager = idx(['manager', 'mgr', 'coach']);

      const get = (row, i) => (i == null ? '' : String(row[i] ?? '').trim());

      const formattedData = rows
        .filter((row) => get(row, cSeason) && get(row, cTeam))
        .map((row) => ({
          season: get(row, cSeason),
          division: get(row, cDivision),
          position: get(row, cPosition),
          team: get(row, cTeam),
          played: get(row, cPlayed),
          won: get(row, cWon),
          drawn: get(row, cDrawn),
          lost: get(row, cLost),
          goals_for: get(row, cGF),
          goals_against: get(row, cGA),
          goal_difference: get(row, cGD),
          points: get(row, cPoints),
          start_date: get(row, cStart),
          manager: get(row, cManager),
        }));

      setAllPositionData(formattedData);
      setDataLoaded(true);

      const latestSeason = Math.max(
        ...formattedData.map((row) => parseInt(row.season, 10) || 0)
      ).toString();
      setSelectedSeason(latestSeason);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [API_KEY, SHEET_ID, SHEET_RANGE]);

  useEffect(() => {
    loadFromGoogleSheets();
  }, [loadFromGoogleSheets]);

  // === Status & styling helpers ===
  const getTeamTags = (position, division) => {
    const pos = parseInt(position || 0, 10);
    const div = parseInt(division || 0, 10);
    const tags = [];

    if (pos === 1)
      tags.push({
        label: 'Champions',
        style: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
      });

    if (div === 1 && pos >= 2 && pos <= 4)
      tags.push({
        label: 'SMFA Champions Cup',
        style: 'bg-purple-100 text-purple-800 border border-purple-300',
      });

    if (div === 1 && pos >= 5 && pos <= 10)
      tags.push({
        label: 'SMFA Shield',
        style: 'bg-indigo-100 text-indigo-800 border border-indigo-300',
      });

    if (div >= 2 && div <= 5 && (pos === 2 || pos === 3))
      tags.push({
        label: 'Auto-Promoted',
        style: 'bg-green-100 text-green-800 border border-green-300',
      });

    if (div >= 2 && div <= 5 && pos >= 4 && pos <= 7)
      tags.push({
        label: 'Playoffs',
        style: 'bg-blue-100 text-blue-800 border border-blue-300',
      });

    if (div >= 1 && div <= 4 && pos >= 17 && pos <= 20)
      tags.push({
        label: 'Relegated',
        style: 'bg-red-100 text-red-800 border border-red-300',
      });

    if (pos >= 18 && pos <= 20)
      tags.push({
        label: 'Auto-Sacked',
        style: 'bg-rose-200 text-rose-900 border border-rose-400',
      });

    return tags;
  };

  const getRowStyling = (position, division) => {
    const pos = parseInt(position || 0, 10);
    const div = parseInt(division || 0, 10);

    if (pos >= 18 && pos <= 20)
      return 'bg-rose-50 border-l-4 border-rose-700 ring-1 ring-rose-200 hover:bg-rose-100';
    if (div >= 1 && div <= 4 && pos >= 17 && pos <= 20)
      return 'bg-red-50 border-l-4 border-red-700 ring-1 ring-red-200 hover:bg-red-100';
    if (pos === 1)
      return 'bg-yellow-50 border-l-4 border-yellow-500 ring-1 ring-yellow-200 hover:bg-yellow-100';
    if (div >= 2 && div <= 5 && (pos === 2 || pos === 3))
      return 'bg-green-50 border-l-4 border-green-600 ring-1 ring-green-200 hover:bg-green-100';
    if (div >= 2 && div <= 5 && pos >= 4 && pos <= 7)
      return 'bg-blue-50 border-l-4 border-blue-600 ring-1 ring-blue-200 hover:bg-blue-100';
    return 'bg-white hover:bg-gray-50';
  };

  const getPositionBadge = (position, division) => {
    const pos = parseInt(position || 0, 10);
    const div = parseInt(division || 0, 10);

    if (pos >= 18 && pos <= 20) return { bg: 'bg-rose-600', text: 'text-white', icon: '⛔' }; // strongest
    if (div >= 1 && div <= 4 && pos >= 17 && pos <= 20) return { bg: 'bg-red-600', text: 'text-white', icon: '⬇️' };
    if (pos === 1) return { bg: 'bg-yellow-500', text: 'text-white', icon: '👑' };
    if (div >= 2 && div <= 5 && (pos === 2 || pos === 3)) return { bg: 'bg-green-600', text: 'text-white', icon: '⬆️' };
    if (div >= 2 && div <= 5 && pos >= 4 && pos <= 7) return { bg: 'bg-blue-600', text: 'text-white', icon: '🏁' };
    if (div === 1 && pos >= 2 && pos <= 4) return { bg: 'bg-purple-600', text: 'text-white', icon: '🏆' }; // UCL
    if (div === 1 && pos >= 5 && pos <= 10) return { bg: 'bg-indigo-600', text: 'text-white', icon: '🛡️' }; // Shield

    return { bg: 'bg-gray-200', text: 'text-gray-800', icon: '' };
  };

  // === Transforms & options ===
  const getFilteredData = (season = null, division = null, sortOrder = 'position') => {
    let filtered = [...allPositionData];

    if (season) filtered = filtered.filter((r) => (r.season || '').trim() === (season || '').trim());
    if (division)
      filtered = filtered.filter((r) => (r.division || '').trim() === (division || '').trim());

    switch (sortOrder) {
      case 'points':
        return filtered.sort(
          (a, b) => parseInt(b.points || 0, 10) - parseInt(a.points || 0, 10)
        );
      case 'team':
        return filtered.sort((a, b) => a.team.localeCompare(b.team));
      case 'manager':
        return filtered.sort((a, b) => (a.manager || '').localeCompare(b.manager || ''));
      case 'division':
        return filtered.sort((a, b) => {
          const divCompare =
            parseInt(a.division || 0, 10) - parseInt(b.division || 0, 10);
          return divCompare !== 0
            ? divCompare
            : parseInt(a.position || 0, 10) - parseInt(b.position || 0, 10);
        });
      case 'position':
      default:
        return filtered.sort(
          (a, b) => parseInt(a.position || 0, 10) - parseInt(b.position || 0, 10)
        );
    }
  };

  const availableSeasons = [...new Set(allPositionData.map((r) => (r.season || '').trim()))]
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));

  const availableDivisions = [
    ...new Set(
      allPositionData
        .filter((r) => (r.season || '').trim() === (selectedSeason || '').trim())
        .map((r) => (r.division || '').trim())
    ),
  ]
    .filter(Boolean)
    .sort();

  // === Components ===
  const SearchResults = () => {
    const filtered = allPositionData
      .filter(
        (team) =>
          team.team.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (team.manager && team.manager.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => {
        const seasonCompare = parseInt(b.season || 0, 10) - parseInt(a.season || 0, 10);
        if (seasonCompare !== 0) return seasonCompare;
        const divCompare = parseInt(a.division || 0, 10) - parseInt(b.division || 0, 10);
        if (divCompare !== 0) return divCompare;
        return parseInt(a.position || 0, 10) - parseInt(b.position || 0, 10);
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
            const badge = getPositionBadge(team.position, team.division);
            return (
              <div
                key={index}
                className={`${getRowStyling(team.position, team.division)} rounded-xl p-6 shadow-lg transition-all hover:shadow-xl`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h4 className="text-xl font-bold text-gray-900">{team.team}</h4>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${badge.bg} ${badge.text}`}
                      >
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
                        <p className="font-semibold">
                          S{team.season} D{team.division}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Record</p>
                        <p className="font-semibold">
                          {team.won}W {team.drawn}D {team.lost}L
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Goal Difference</p>
                        <p
                          className={`font-semibold ${
                            parseInt(team.goal_difference || 0, 10) >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {parseInt(team.goal_difference || 0, 10) > 0 ? '+' : ''}
                          {team.goal_difference}
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

  const LeagueTable = () => {
    const tableData = getFilteredData(selectedSeason, selectedDivision, sortBy);

    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header with controls */}
        <div className="p-6 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-2xl font-bold">
                Season {selectedSeason} - Division {selectedDivision}
              </h3>
              <p className="text-blue-200">Complete League Table ({tableData.length} teams)</p>
              <p className="text-xs text-blue-300 mt-1">Soccer Manager Worlds Top 100 Elite Community</p>
            </div>

            {/* Sort Controls */}
            <div className="flex gap-2 flex-wrap">
              {[
                { id: 'position', label: 'Position', icon: Trophy },
                { id: 'points', label: 'Points', icon: Target },
                { id: 'team', label: 'Team A-Z', icon: SortAsc },
                { id: 'manager', label: 'Manager A-Z', icon: Users },
              ].map((sort) => (
                <button
                  key={sort.id}
                  onClick={() => setSortBy(sort.id)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    sortBy === sort.id ? 'bg-white text-blue-600 shadow-lg' : 'bg-blue-500 hover:bg-blue-400 text-white'
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
                const badge = getPositionBadge(team.position, selectedDivision);
                const tags = getTeamTags(team.position, selectedDivision);
                return (
                  <tr
                    key={index}
                    className={`${getRowStyling(
                      team.position,
                      selectedDivision
                    )} border-b border-gray-100 transition-all hover:shadow-md`}
                  >
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold ${badge.bg} ${badge.text}`}
                        title={tags.map((t) => t.label).join(' • ')}
                      >
                        {badge.icon ? `${badge.icon} ` : ''}
                        {team.position}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-start gap-3">
                        <div>
                          <div className="font-bold text-gray-900 text-lg">{team.team}</div>
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {team.manager || 'Unknown Manager'}
                          </div>
                          {tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {tags.map((t, i) => (
                                <span key={i} className={`px-2 py-0.5 rounded-md text-xs font-semibold ${t.style}`}>
                                  {t.label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center font-semibold">{team.played}</td>
                    <td className="py-4 px-3 text-center font-bold text-green-600">{team.won}</td>
                    <td className="py-4 px-3 text-center font-semibold text-gray-600">{team.drawn}</td>
                    <td className="py-4 px-3 text-center font-bold text-red-600">{team.lost}</td>
                    <td className="py-4 px-3 text-center font-semibold">{team.goals_for}</td>
                    <td className="py-4 px-3 text-center font-semibold">{team.goals_against}</td>
                    <td
                      className={`py-4 px-3 text-center font-bold ${
                        parseInt(team.goal_difference || 0, 10) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {parseInt(team.goal_difference || 0, 10) > 0 ? '+' : ''}
                      {team.goal_difference}
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
              <h4 className="font-semibold text-gray-700 mb-2">Legend</h4>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-yellow-300 rounded border border-yellow-500" />
                  <span>Champions (1st)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-green-300 rounded border border-green-600" />
                  <span>Auto-Promoted (2nd–3rd in D2–D5)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-blue-300 rounded border border-blue-600" />
                  <span>Playoffs (4th–7th in D2–D5)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-red-300 rounded border border-red-700" />
                  <span>Relegated (17th–20th in D1–D4)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-rose-400 rounded border border-rose-700" />
                  <span>Automatic Sacking (18th–20th all divisions)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-purple-300 rounded border border-purple-500" />
                  <span>D1: SMFA Champions Cup (2nd–4th)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-indigo-300 rounded border border-indigo-500" />
                  <span>D1: SMFA Shield (5th–10th)</span>
                </div>
              </div>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p className="font-semibold">Current View:</p>
              <p>Sorted by: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}</p>
              <p>
                Season {selectedSeason} Division {selectedDivision}
              </p>
              <p>{tableData.length} teams displayed</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const StatsCard = ({ icon: Icon, title, value, subtitle, color = 'blue' }) => (
    <div
      className={`bg-gradient-to-br from-${color}-50 to-${color}-100 rounded-xl p-6 shadow-lg border border-${color}-200 hover:shadow-xl transition-all`}
    >
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

  // === Layout ===
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
              <StatsCard
                icon={Calendar}
                title="Seasons"
                value={availableSeasons.length || 0}
                subtitle="Historical coverage"
                color="blue"
              />
              <StatsCard icon={BarChart3} title="Divisions" value="5" subtitle="Competitive tiers" color="purple" />
              <StatsCard
                icon={Database}
                title="Records"
                value={allPositionData.length.toLocaleString() || '0'}
                subtitle="Positions tracked"
                color="green"
              />
              <StatsCard icon={Users} title="Elite Teams" value="100" subtitle="Community size" color="yellow" />
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
              { id: 'setup', label: 'Setup Guide', icon: Database, color: 'gray' },
            ].map((tab) => (
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
        {/* Search & selectors */}
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

            {activeTab === 'tables' && availableSeasons.length > 0 && (
              <>
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="px-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-white"
                >
                  {availableSeasons.map((season) => (
                    <option key={season} value={season}>
                      Season {season}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className="px-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-white"
                >
                  {availableDivisions.map((div) => (
                    <option key={div} value={div}>
                      Division {div}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {/* Content sections */}
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
          <div className="space-y-6">{dataLoaded ? <LeagueTable /> : <TablesPlaceholder setActiveTab={setActiveTab} />}</div>
        )}

        {activeTab === 'statistics' && (
          <StatisticsPanel
            dataLoaded={dataLoaded}
            allPositionData={allPositionData}
            availableSeasons={availableSeasons}
          />
        )}

        {activeTab === 'setup' && <SetupPanel loadFromGoogleSheets={loadFromGoogleSheets} loading={loading} />}
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
                  {dataLoaded ? `${allPositionData.length.toLocaleString()} records` : 'Setup required'}
                  <br />
                  {availableSeasons.length || '25+'} seasons covered
                  <br />
                  5 competitive divisions
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-green-300">Features</h4>
                <p className="text-sm text-gray-400">
                  Advanced search & filtering
                  <br />
                  Complete league tables
                  <br />
                  Manager tracking
                  <br />
                  Live Google Sheets integration
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-purple-300">Community</h4>
                <p className="text-sm text-gray-400">
                  100 elite managers
                  <br />
                  Historical achievements
                  <br />
                  Performance analytics
                  <br />
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

// === Small subcomponents (all used) ===
const TablesPlaceholder = ({ setActiveTab }) => (
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
);

const StatisticsPanel = ({ dataLoaded, allPositionData, availableSeasons }) => (
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
        subtitle={dataLoaded ? '✅ Connected' : '❌ Not connected'}
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
        value={allPositionData.length.toLocaleString() || '0'}
        subtitle="Position entries"
        color="purple"
      />
      <StatsCard
        icon={Trophy}
        title="Database Status"
        value={dataLoaded ? 'Live' : 'Setup'}
        subtitle={dataLoaded ? 'Real-time updates' : 'Needs configuration'}
        color="yellow"
      />
    </div>
  </div>
);

const SetupPanel = ({ loadFromGoogleSheets, loading }) => (
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
            <p>✅ Sheet ID configured</p>
            <code className="block bg-green-100 p-2 rounded text-xs break-all">…</code>
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
              REACT_APP_SHEET_ID=…<br />
              REACT_APP_GOOGLE_API_KEY=…
            </code>
          </div>
        </div>
      </div>

      {/* Test Connection */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
        <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Test Your Connection
        </h4>
        <p className="text-yellow-700 text-sm mb-3">Click below to fetch fresh data from Google Sheets:</p>
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
);

export default Top100Archive;
