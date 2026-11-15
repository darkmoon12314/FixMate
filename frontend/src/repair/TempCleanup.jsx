import { useState } from 'react';
import './TempCleanup.css';

const AGENT_BASE_URL = 'http://127.0.0.1:8765';

function TempCleanup() {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [quarantineHistory, setQuarantineHistory] = useState([]);

  // Send the logged-in FixMate user's JWT to the Local Agent.
  // No separate Agent token or browser prompt is required.
  const agentRequest = async (endpoint, options = {}) => {
    const jwt = localStorage.getItem('fixmateToken');

    if (!jwt) {
      throw new Error('Your FixMate session is missing. Please log in again.');
    }

    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${jwt}`);
    headers.set('Accept', 'application/json');

    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    let response;

    try {
      response = await fetch(`${AGENT_BASE_URL}${endpoint}`, {
        ...options,
        headers
      });
    } catch {
      throw new Error(
        'Cannot connect to FixMate Local Agent. Please make sure the Agent is running.'
      );
    }

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      throw new Error(
        data.detail || 'Your FixMate login has expired. Please log in again.'
      );
    }

    if (!response.ok) {
      throw new Error(
        data.detail || data.message || `Agent request failed (${response.status}).`
      );
    }

    return data;
  };

  const scanTemporaryFiles = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    setScanResult(null);
    setSelectedFiles([]);

    try {
      const data = await agentRequest('/api/repairs/temp/scan', {
        method: 'GET'
      });

      setScanResult(data);
    } catch (err) {
      setError(err.message || 'Unable to connect to FixMate Agent.');
    } finally {
      setLoading(false);
    }
  };

  const loadQuarantineHistory = async () => {
    setActionLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const data = await agentRequest('/api/repairs/temp/history', {
        method: 'GET'
      });

      setQuarantineHistory(data.history || []);
      setSuccessMessage('Quarantine history loaded successfully.');
    } catch (err) {
      setError(err.message || 'Unable to load quarantine history.');
    } finally {
      setActionLoading(false);
    }
  };

  const quarantineSelectedFiles = async () => {
    if (selectedFiles.length === 0) {
      setError('Select at least one file to quarantine.');
      return;
    }

    const confirmed = window.confirm(
      `Move ${selectedFiles.length} selected file(s) to FixMate Quarantine? You can restore them during the 7-day restore period.`
    );

    if (!confirmed) return;

    setActionLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const data = await agentRequest('/api/repairs/temp/quarantine', {
        method: 'POST',
        body: JSON.stringify({
          file_ids: selectedFiles.map((file) => file.fileId)
        })
      });

      const movedCount = data.quarantinedCount || 0;
      setSuccessMessage(
        `${movedCount} file(s) quarantined. Batch ID: ${data.batchId || 'Not available'}`
      );

      setSelectedFiles([]);

      // Refresh the scan and history after a successful operation.
      const [freshScan, historyData] = await Promise.all([
        agentRequest('/api/repairs/temp/scan', { method: 'GET' }),
        agentRequest('/api/repairs/temp/history', { method: 'GET' })
      ]);

      setScanResult(freshScan);
      setQuarantineHistory(historyData.history || []);
    } catch (err) {
      setError(err.message || 'Quarantine operation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const restoreQuarantineBatch = async (batchId) => {
    const confirmed = window.confirm(
      'Restore all remaining files in this quarantine batch to their original locations? Existing files will not be overwritten.'
    );

    if (!confirmed) return;

    setActionLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const data = await agentRequest('/api/repairs/temp/restore', {
        method: 'POST',
        body: JSON.stringify({ batch_id: batchId })
      });

      const restoredCount = (data.results || []).filter(
        (item) => item.status === 'restored'
      ).length;

      setSuccessMessage(
        `${restoredCount} file(s) restored. Remaining files: ${data.remainingFiles ?? 'Unknown'}.`
      );

      const [historyData, freshScan] = await Promise.all([
        agentRequest('/api/repairs/temp/history', { method: 'GET' }),
        agentRequest('/api/repairs/temp/scan', { method: 'GET' })
      ]);

      setQuarantineHistory(historyData.history || []);
      setScanResult(freshScan);
    } catch (err) {
      setError(err.message || 'Restore operation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatSize = (bytes = 0) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const toggleFileSelection = (file) => {
    setSelectedFiles((previous) => {
      const alreadySelected = previous.some(
        (item) => item.fileId === file.fileId
      );

      if (alreadySelected) {
        return previous.filter((item) => item.fileId !== file.fileId);
      }

      return [...previous, file];
    });
  };

  const isSelected = (fileId) => {
    return selectedFiles.some((file) => file.fileId === fileId);
  };

  const selectedSize = selectedFiles.reduce(
    (total, file) => total + file.sizeBytes,
    0
  );

  const renderFileSection = ({
    title,
    description,
    files,
    count,
    status,
    canSelect,
    recommendation
  }) => {
    const sectionSize = files.reduce(
      (total, file) => total + file.sizeBytes,
      0
    );

    return (
      <section className="temp-category-section" key={status}>
        <div className="temp-category-header">
          <div>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>

          <span className={`temp-status ${status}`}>
            {count} Files
          </span>
        </div>

        {recommendation && (
          <div className="temp-recommendation">{recommendation}</div>
        )}

        <div className="temp-category-summary">
          <span>Displayed: {files.length} / {count}</span>
          <span>Displayed size: {formatSize(sectionSize)}</span>
        </div>

        {files.length === 0 ? (
          <div className="temp-empty">No files found in this category.</div>
        ) : (
          <div className="temp-table-wrapper">
            <table className="temp-table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>File Name</th>
                  <th>Size</th>
                  <th>Age</th>
                  <th>Last Modified</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {files.map((file) => (
                  <tr key={file.fileId}>
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected(file.fileId)}
                        disabled={!canSelect || actionLoading}
                        onChange={() => toggleFileSelection(file)}
                        aria-label={`Select ${file.name}`}
                      />
                    </td>

                    <td className="temp-file-name">
                      <span title={file.path}>{file.name}</span>
                    </td>

                    <td>{formatSize(file.sizeBytes)}</td>
                    <td>{file.ageDays} days</td>
                    <td>{file.modifiedAt}</td>

                    <td>
                      <span className={`temp-file-status ${file.lockStatus}`}>
                        {file.lockStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {count > files.length && (
          <p className="temp-notice">
            {count - files.length} additional files are not shown.
          </p>
        )}
      </section>
    );
  };

  const oldFiles = scanResult?.oldFiles || [];
  const recentFiles = scanResult?.recentFiles || [];
  const inUseFiles = scanResult?.inUseFiles || [];
  const unknownFiles = scanResult?.unknownFiles || [];

  return (
    <div className="temp-cleanup-page">
      <div className="temp-cleanup-header">
        <div>
          <h2>Temporary File Cleanup</h2>
          <p>
            Scan and review temporary files. Selected files can be moved to
            quarantine and restored later.
          </p>
        </div>

        <button
          className="temp-scan-button"
          onClick={scanTemporaryFiles}
          disabled={loading || actionLoading}
        >
          {loading ? 'Scanning...' : 'Scan Temporary Files'}
        </button>
      </div>

      {error && <div className="temp-error" role="alert">{error}</div>}
      {successMessage && (
        <div className="temp-success" role="status">{successMessage}</div>
      )}

      <div className="temp-history-actions">
        <button
          type="button"
          className="temp-clear-button"
          onClick={loadQuarantineHistory}
          disabled={actionLoading || loading}
        >
          {actionLoading ? 'Please wait...' : 'Refresh Quarantine History'}
        </button>
      </div>

      {scanResult && (
        <>
          <div className="temp-summary">
            <div className="temp-summary-card">
              <span>Total Files</span>
              <h3>{scanResult.totalFiles}</h3>
            </div>

            <div className="temp-summary-card">
              <span>Total Size</span>
              <h3>{formatSize(scanResult.totalSizeBytes)}</h3>
            </div>

            <div className="temp-summary-card">
              <span>Old Files</span>
              <h3>{scanResult.oldFileCount}</h3>
            </div>

            <div className="temp-summary-card">
              <span>Recent Files</span>
              <h3>{scanResult.recentFileCount}</h3>
            </div>

            <div className="temp-summary-card">
              <span>Locked Files</span>
              <h3>{scanResult.inUseFileCount}</h3>
            </div>

            <div className="temp-summary-card">
              <span>Unknown Status</span>
              <h3>{scanResult.unknownStatusCount}</h3>
            </div>
          </div>

          <div className="temp-results">
            <h3>Scan Information</h3>
            <p>Folder: {scanResult.folder}</p>
            <p>
              Old file threshold: More than {scanResult.thresholdDays} days
            </p>
            <p>Skipped files: {scanResult.skippedFiles}</p>
            <p className="temp-notice">
              Files are scanned and displayed first. Quarantine only moves
              files you explicitly select; it does not permanently delete them.
            </p>
          </div>

          <div className="temp-selection-summary">
            <div>
              <h3>Selected Files</h3>
              <p>{selectedFiles.length} files selected</p>
            </div>

            <div>
              <h3>{formatSize(selectedSize)}</h3>
              <p>Total selected size</p>
            </div>

            <button
              type="button"
              className="temp-clear-button"
              onClick={() => setSelectedFiles([])}
              disabled={selectedFiles.length === 0 || actionLoading}
            >
              Clear Selection
            </button>

            <button
              type="button"
              className="temp-scan-button"
              onClick={quarantineSelectedFiles}
              disabled={selectedFiles.length === 0 || actionLoading}
            >
              {actionLoading ? 'Please wait...' : 'Quarantine Selected'}
            </button>
          </div>

          {renderFileSection({
            title: 'Old Files',
            description: 'Files modified more than 15 days ago.',
            files: oldFiles,
            count: scanResult.oldFileCount,
            status: 'old',
            canSelect: true,
            recommendation:
              'Review older files. Select only files you recognize and no longer need.'
          })}

          {renderFileSection({
            title: 'Recent Files',
            description: 'Files modified within the last 15 days.',
            files: recentFiles,
            count: scanResult.recentFileCount,
            status: 'recent',
            canSelect: true,
            recommendation:
              'These files are relatively recent. Review carefully before selecting.'
          })}

          {renderFileSection({
            title: 'Windows Locked / In-use Files',
            description:
              'Files for which Windows reported a sharing or lock violation.',
            files: inUseFiles,
            count: scanResult.inUseFileCount,
            status: 'locked',
            canSelect: false,
            recommendation:
              'These files cannot be selected for quarantine in this version.'
          })}

          {renderFileSection({
            title: 'Unknown Status Files',
            description:
              'Files whose lock status could not be determined.',
            files: unknownFiles,
            count: scanResult.unknownStatusCount,
            status: 'unknown',
            canSelect: false,
            recommendation:
              'These files need extra caution. Selection is disabled.'
          })}
        </>
      )}

      <section className="temp-category-section temp-history-section">
        <div className="temp-category-header">
          <div>
            <h3>Quarantine History</h3>
            <p>Review quarantined batches and restore remaining files.</p>
          </div>
          <span className="temp-status recent">
            {quarantineHistory.length} Batches
          </span>
        </div>

        {quarantineHistory.length === 0 ? (
          <div className="temp-empty">
            No history loaded yet. Click “Refresh Quarantine History”.
          </div>
        ) : (
          <div className="temp-table-wrapper">
            <table className="temp-table">
              <thead>
                <tr>
                  <th>Batch ID</th>
                  <th>Created</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Remaining</th>
                  <th>Restored</th>
                  <th>Files</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {quarantineHistory.map((batch) => (
                  <tr key={batch.batchId}>
                    <td className="temp-file-name">
                      <span title={batch.batchId}>{batch.batchId}</span>
                    </td>
                    <td>
                      {batch.createdAt
                        ? new Date(batch.createdAt).toLocaleString()
                        : '—'}
                    </td>
                    <td>
                      {batch.expiresAt
                        ? new Date(batch.expiresAt).toLocaleString()
                        : '—'}
                    </td>
                    <td>{batch.status}</td>
                    <td>{batch.totalFiles}</td>
                    <td>{batch.quarantinedFiles}</td>
                    <td>{batch.restoredFiles}</td>
                    <td className="temp-history-files">
                      {Array.isArray(batch.files) && batch.files.length > 0 ? (
                        <ul>
                          {batch.files.map((file, index) => (
                            <li key={`${file.name}-${index}`}>
                              <span>{file.name}</span>
                              <small> ({file.status})</small>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        'No file details available'
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="temp-clear-button"
                        onClick={() => restoreQuarantineBatch(batch.batchId)}
                        disabled={
                          actionLoading ||
                          batch.quarantinedFiles === 0 ||
                          batch.status === 'expired'
                        }
                      >
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="temp-safety-notice">
        <strong>Safety Notice</strong>
        <p>
          File age and lock status do not guarantee that a file is safe to
          move. Review each selection carefully. Quarantined files are kept
          for a limited restore period; this interface does not permanently
          delete files.
        </p>
      </div>
    </div>
  );
}

export default TempCleanup;
