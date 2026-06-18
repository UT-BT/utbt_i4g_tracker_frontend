const { useState, useEffect } = React;

const CSV_PATHS = [
  './resources/data/unbeaten_i4g_records.csv',
  './unbeaten_i4g_records.csv',
];

const PAGE_SIZE = 25;
const METADATA_PATHS = [
  './resources/data/run_metadata.csv',
  './run_metadata.csv',
];

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) {
    return [];
  }

  const headers = lines[0].split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map((value) =>
    value.replace(/^\"|\"$/g, '').trim()
  );

  return lines.slice(1).map((line) => {
    const values = line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map((value) =>
      value.replace(/^\"|\"$/g, '').replace(/\"\"/g, '"').trim()
    );
    return headers.reduce((row, header, index) => {
      row[header] = values[index] ?? '';
      return row;
    }, {});
  });
}

async function loadCsv() {
  let lastError = null;

  for (const path of CSV_PATHS) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        lastError = new Error(`Failed to load ${path} (${response.status})`);
        continue;
      }
      const text = await response.text();
      return parseCsv(text);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to load CSV data. Ensure the scraper wrote frontend/resources/data/unbeaten_i4g_records.csv and serve the site over http.');
}

async function loadMetadata() {
  let lastError = null;

  for (const path of METADATA_PATHS) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        lastError = new Error(`Failed to load ${path} (${response.status})`);
        continue;
      }
      const text = await response.text();
      const rows = parseCsv(text);
      return rows.reduce((meta, row) => {
        if (row.metric) {
          meta[row.metric] = row.value ?? '';
        }
        return meta;
      }, {});
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to load metadata. Ensure the scraper wrote frontend/resources/data/run_metadata.csv and serve the site over http.');
}

function Table({ records, onSort, sortKey, sortOrder }) {
  if (records.length === 0) {
    return React.createElement('p', { className: 'empty-state' }, 'No records found in the CSV.');
  }

  const headerCell = (key, label) =>
    React.createElement(
      'th',
      {
        key,
        className: `sortable ${sortKey === key ? `sorted-${sortOrder}` : ''}`,
        onClick: () => onSort(key),
      },
      `${label}${sortKey === key ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}`
    );

  return React.createElement(
    'div',
    { className: 'table-wrapper' },
    React.createElement(
      'table',
      null,
      React.createElement(
        'thead',
        null,
        React.createElement(
          'tr',
          null,
          React.createElement('th', { key: 'idx', rowSpan: 2 }, '#'),
          React.createElement('th', { key: 'map-placeholder' }),
          React.createElement('th', { key: 'diff-placeholder' }),
          React.createElement('th', { key: 'utbt', colSpan: 3, className: 'group-utbt' }, 'UTBT'),
          React.createElement('th', { key: 'i4g', colSpan: 3, className: 'group-i4g' }, 'i4G')
        ),
        React.createElement(
          'tr',
          null,
          headerCell('map', 'Map'),
          headerCell('diff', 'Diff'),
          headerCell('utbt_record', 'Record'),
          headerCell('utbt_member', 'Member'),
          headerCell('utbt_date', 'Date'),
          headerCell('record', 'Record'),
          headerCell('member', 'Member'),
          headerCell('date', 'Date')
        )
      ),
      React.createElement(
        'tbody',
        null,
        records.map((record, rowIndex) =>
          React.createElement(
            'tr',
            { key: `${record.map}-${rowIndex}` },
            React.createElement('td', { key: `idx-${rowIndex}` }, String(rowIndex + 1)),
            React.createElement('td', { key: `map-${rowIndex}` }, record['map'] || ''),
            React.createElement('td', { key: `diff-${rowIndex}`, className: 'diff-value' }, formatTimeDiff(record['utbt_record'], record['record'])),
            React.createElement('td', { key: `utbt_record-${rowIndex}` }, record['utbt_record'] || ''),
            React.createElement('td', { key: `utbt_member-${rowIndex}` }, record['utbt_member'] || ''),
            React.createElement('td', { key: `utbt_date-${rowIndex}` }, formatDateForDisplay(record['utbt_date'])),
            React.createElement('td', { key: `i4g_record-${rowIndex}` }, record['record'] || ''),
            React.createElement('td', { key: `i4g_member-${rowIndex}` }, record['member'] || ''),
            React.createElement('td', { key: `i4g_date-${rowIndex}` }, formatDateForDisplay(record['date']))
          )
        )
      )
    )
  );
}

function formatDateForDisplay(dateStr) {
  if (!dateStr) return '';
  // If it already looks like short-month + day (e.g. 'Mon Mar 23') and has no year, leave it alone.
  if (!/\d{4}/.test(dateStr)) {
    return dateStr;
  }

  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;

  // Format like: 'Tue Jul 31, 2012' (no comma after weekday)
  const formatted = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  // Remove the comma after weekday (to match example)
  return formatted.replace(/^(\w{3}),\s*/, '$1 ');
}

function formatDateValue(v) {
  return v && typeof v === 'string' && v.trim() !== '';
}

function formatRunTimestampLocal(utcTimestamp) {
  if (!utcTimestamp) return '';
  const date = new Date(utcTimestamp);
  if (Number.isNaN(date.getTime())) return utcTimestamp;

  const month = date.toLocaleString('en-US', { month: 'long' });
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${month}, ${day}, ${year} ${hours}:${minutes}.${seconds}`;
}

function formatNextUpdateLocal(utcTimestamp) {
  if (!utcTimestamp) return '';
  const date = new Date(utcTimestamp);
  if (Number.isNaN(date.getTime())) return utcTimestamp;

  const nextDate = new Date(date.getTime() + 12 * 60 * 60 * 1000);
  const month = nextDate.toLocaleString('en-US', { month: 'long' });
  const day = String(nextDate.getDate()).padStart(2, '0');
  const year = nextDate.getFullYear();
  const hours = String(nextDate.getHours()).padStart(2, '0');
  const minutes = String(nextDate.getMinutes()).padStart(2, '0');
  const seconds = String(nextDate.getSeconds()).padStart(2, '0');

  return `${month}, ${day}, ${year} ${hours}:${minutes}.${seconds}`;
}

function parseTimeString(value) {
  if (!value || typeof value !== 'string') {
    return NaN;
  }

  const trimmed = value.trim();
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts.length === 2) {
      const minutes = Number(parts[0]);
      const seconds = Number(parts[1]);
      return Number.isFinite(minutes) && Number.isFinite(seconds) ? minutes * 60 + seconds : NaN;
    }
  }

  return Number(trimmed);
}

function formatTimeValue(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '';
  }

  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds - mins * 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`;
  }

  return seconds.toFixed(3);
}

function formatTimeDiff(utbtValue, i4gValue) {
  const utbtSeconds = parseTimeString(utbtValue);
  const i4gSeconds = parseTimeString(i4gValue);
  if (!Number.isFinite(utbtSeconds) || !Number.isFinite(i4gSeconds)) {
    return '';
  }

  const diff = utbtSeconds - i4gSeconds;
  if (diff < 0) {
    return formatTimeValue(Math.abs(diff));
  }
  return formatTimeValue(diff);
}

function compareRecords(a, b, key, order) {
  const getValue = (record) => {
    const value = record[key];
    if (key === 'map' || key === 'utbt_member' || key === 'member') {
      return String(value || '').toLowerCase();
    }
    if (key === 'diff') {
      const diffA = parseTimeString(record.utbt_record) - parseTimeString(record.record);
      return Number.isFinite(diffA) ? diffA : Number.POSITIVE_INFINITY;
    }
    if (key === 'utbt_record' || key === 'record') {
      return parseTimeString(value);
    }
    if (key === 'utbt_date' || key === 'date') {
      const parsed = Date.parse(value);
      return Number.isFinite(parsed) ? parsed : String(value || '').toLowerCase();
    }
    return String(value || '').toLowerCase();
  };

  const left = getValue(a);
  const right = getValue(b);

  if (typeof left === 'number' && typeof right === 'number') {
    if (Number.isNaN(left) && Number.isNaN(right)) return 0;
    if (Number.isNaN(left)) return 1;
    if (Number.isNaN(right)) return -1;
    return order === 'asc' ? left - right : right - left;
  }

  if (left < right) return order === 'asc' ? -1 : 1;
  if (left > right) return order === 'asc' ? 1 : -1;
  return 0;
}

function App() {
  const [records, setRecords] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState('map');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    loadCsv()
      .then((data) => {
        setRecords(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Unable to load CSV data.');
        setLoading(false);
      });

    loadMetadata()
      .then((meta) => setMetadata(meta))
      .catch(() => setMetadata(null));
  }, []);

  const sortedRecords = [...records].sort((a, b) => compareRecords(a, b, sortKey, sortOrder));
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / PAGE_SIZE));
  const pageIndex = Math.min(currentPage, totalPages) - 1;
  const pageRecords = sortedRecords.slice(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE);
  const startRecord = pageIndex * PAGE_SIZE + 1;
  const endRecord = startRecord + pageRecords.length - 1;

  const handleSort = (key) => {
    if (key === sortKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) {
      return;
    }
    setCurrentPage(newPage);
  };

  return React.createElement(
    'div',
    { className: 'app-shell' },
    React.createElement('header', { className: 'hero' },
      React.createElement('h1', null, 'UTBT vs i4G Records'),
        React.createElement(
          'p',
          { className: 'description' },
          'Maps where i4G leaderboard records are faster than the UTBT world records. Maps on one platform that are not on the other are automatically excluded and will not show up here.'
        ),
        !loading && !error && React.createElement(
          'p',
          { className: 'summary' },
          metadata && metadata.utbt_bulk_map_count
            ? `${records.length} maps still faster on i4G than on UTBT (${Math.round(
                (records.length / Number(metadata.utbt_bulk_map_count)) * 100
              )}% of all UTBT maps)`
            : `${records.length} maps still faster on i4G than on UTBT.`
        ),
        metadata?.run_timestamp_utc && React.createElement(
          'p',
          { className: 'summary' },
          `Last updated: ${formatRunTimestampLocal(metadata.run_timestamp_utc)}`
        ),
        metadata?.run_timestamp_utc && React.createElement(
          'p',
          { className: 'summary' },
          `Next update approximately at: ${formatNextUpdateLocal(metadata.run_timestamp_utc)}`
        )
    ),
    React.createElement('section', { className: 'content-section' },
      loading && React.createElement('p', null, 'Loading records...'),
      error && React.createElement('div', { className: 'error' }, error),
      !loading && !error && React.createElement(
        React.Fragment,
        null,
        React.createElement(Table, {
          records: pageRecords,
          onSort: handleSort,
          sortKey,
          sortOrder,
        }),
        React.createElement(
          'div',
          { className: 'pagination-controls' },
          React.createElement(
            'button',
            {
              type: 'button',
              disabled: currentPage <= 1,
              onClick: () => handlePageChange(currentPage - 1),
            },
            'Previous'
          ),
          React.createElement(
            'span',
            { className: 'pagination-summary' },
            `Page ${Math.min(currentPage, totalPages)} of ${totalPages} · Showing ${startRecord}–${endRecord} of ${records.length}`
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              disabled: currentPage >= totalPages,
              onClick: () => handlePageChange(currentPage + 1),
            },
            'Next'
          )
        )
      )
    )
  );
}

const rootElement = document.getElementById('root');
ReactDOM.createRoot(rootElement).render(React.createElement(App));
