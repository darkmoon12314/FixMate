import { useState } from 'react'
import './NetworkTroubleshooting.css'

const AGENT_BASE_URL = 'http://127.0.0.1:8765'

function NetworkTroubleshooting() {
  const [report, setReport] = useState(null)

  const [loading, setLoading] = useState(false)
  const [flushing, setFlushing] = useState(false)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [dnsMessage, setDnsMessage] = useState('')
  const [dnsError, setDnsError] = useState('')

  // Send the logged-in FixMate user's JWT to the Local Agent.
  // No separate Agent token or browser prompt is required.
  const agentRequest = async (endpoint, method = 'GET') => {
    const jwt = localStorage.getItem('fixmateToken')

    if (!jwt) {
      throw new Error('Your FixMate session is missing. Please log in again.')
    }

    const headers = new Headers({
      Accept: 'application/json',
      Authorization: `Bearer ${jwt}`,
    })

    let response

    try {
      response = await fetch(`${AGENT_BASE_URL}${endpoint}`, {
        method,
        headers,
      })
    } catch {
      throw new Error(
        'Cannot connect to FixMate Local Agent. Please make sure the Agent is running.'
      )
    }

    const data = await response.json().catch(() => ({}))

    if (response.status === 401) {
      throw new Error(
        data.detail || 'Your FixMate login has expired. Please log in again.'
      )
    }

    if (!response.ok) {
      throw new Error(
        data.detail || `Agent request failed: HTTP ${response.status}`
      )
    }

    return data
  }

  // Run network diagnostics
  const runDiagnostics = async () => {
    setLoading(true)
    setError('')
    setMessage('')
    setReport(null)

    try {
      const data = await agentRequest(
        '/api/repairs/network/diagnostics'
      )

      setReport(data)
      setMessage(data.message || 'Network diagnostics completed.')
    } catch (err) {
      setError(err.message || 'Unable to run network diagnostics.')
    } finally {
      setLoading(false)
    }
  }

  // Flush Windows DNS cache
  const flushDNS = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to flush the Windows DNS Resolver Cache? This clears cached DNS lookups. It does not change your Wi-Fi or network adapter settings.'
    )

    if (!confirmed) return

    setFlushing(true)
    setDnsError('')
    setDnsMessage('')
    setError('')

    try {
      const data = await agentRequest(
        '/api/repairs/network/flush-dns',
        'POST'
      )

      setDnsMessage(
        data.message || 'DNS Cache flushed successfully.'
      )
    } catch (err) {
      setDnsError(err.message || 'Unable to flush DNS cache.')
    } finally {
      setFlushing(false)
    }
  }

  // Reusable status display
  const Status = ({ success, label }) => (
    <span
      className={`network-status ${
        success ? 'success' : 'failed'
      }`}
    >
      {success ? '✓' : '✕'} {label}
    </span>
  )

  return (
    <div className="network-page">
      {/* Page Header */}
      <div className="network-header">
        <div className="network-icon">🌐</div>
        <h1>Network Troubleshooting</h1>
        <p>
          Diagnose common network connectivity issues and safely
          troubleshoot your Windows network.
        </p>
      </div>

      {/* Network Diagnostics */}
      <div className="network-info-card">
        <h2>Network Diagnostics</h2>
        <p>
          Check your active network adapter, default gateway,
          DNS resolution and internet connectivity.
        </p>
        <button
          type="button"
          className="network-primary-btn"
          onClick={runDiagnostics}
          disabled={loading}
        >
          {loading ? 'Scanning Network...' : 'Run Network Diagnostics'}
        </button>
      </div>

      {/* General diagnostic messages */}
      {error && (
        <div className="network-alert error-alert" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {message && !error && (
        <div className="network-alert success-alert" role="status">
          {message}
        </div>
      )}

      {/* Diagnostic Results */}
      {report && (
        <div className="network-results">
          <h2>Diagnostic Results</h2>
          <p className="network-checked-time">
            Checked at: {report.checkedAt || 'Recently'}
          </p>

          {/* Active Adapters */}
          <div className="network-result-card">
            <h3>Active Network Adapters</h3>
            {report.activeInterfaces?.length > 0 ? (
              report.activeInterfaces.map((adapter, index) => (
                <div
                  className="network-detail"
                  key={`${adapter.name}-${index}`}
                >
                  <strong>{adapter.name}</strong>
                  <span>
                    IPv4: {adapter.ipv4Addresses?.join(', ') || 'Not available'}
                  </span>
                  <span>
                    Speed: {adapter.speedMbps || 'Unknown'} Mbps
                  </span>
                  <Status
                    success={adapter.isUp}
                    label={adapter.isUp ? 'Active' : 'Inactive'}
                  />
                </div>
              ))
            ) : (
              <p>No active network adapter detected.</p>
            )}
          </div>

          {/* Gateway */}
          <div className="network-result-card">
            <h3>Default Gateway</h3>
            <p>Address: {report.gateway?.target || 'Not detected'}</p>
            <Status
              success={Boolean(report.gateway?.reachable)}
              label={report.gateway?.message || 'Gateway status unavailable'}
            />
          </div>

          {/* DNS */}
          <div className="network-result-card">
            <h3>DNS Resolution</h3>
            <p>Host: {report.dns?.host || 'Not available'}</p>
            <p>
              Response time: {report.dns?.durationMs ?? 'N/A'} ms
            </p>
            <Status
              success={Boolean(report.dns?.success)}
              label={report.dns?.message || 'DNS status unavailable'}
            />
            {report.dns?.resolvedAddresses?.length > 0 && (
              <div className="network-addresses">
                <strong>Resolved Addresses</strong>
                {report.dns.resolvedAddresses.map((address, index) => (
                  <p key={`${address}-${index}`}>{address}</p>
                ))}
              </div>
            )}
          </div>

          {/* Internet */}
          <div className="network-result-card">
            <h3>Internet Connectivity</h3>
            <p>Target: {report.internet?.target || 'Not available'}</p>
            <p>
              Response time: {report.internet?.durationMs ?? 'N/A'} ms
            </p>
            <Status
              success={Boolean(report.internet?.reachable)}
              label={
                report.internet?.message || 'Internet status unavailable'
              }
            />
          </div>

          {report.note && (
            <div className="network-note">
              <strong>Note:</strong> {report.note}
            </div>
          )}
        </div>
      )}

      {/* DNS Cleanup */}
      <div className="network-repair-card">
        <div className="network-repair-icon">🔄</div>
        <h2>DNS Cache Cleanup</h2>
        <p>
          Flush the Windows DNS Resolver Cache to remove cached
          DNS lookups. This may help when a DNS-related issue occurs.
        </p>
        <button
          type="button"
          className="network-repair-btn"
          onClick={flushDNS}
          disabled={flushing}
        >
          {flushing ? 'Flushing DNS...' : 'Flush DNS Cache'}
        </button>

        {dnsMessage && (
          <div
            className="dns-success-message"
            role="status"
            aria-live="polite"
          >
            <strong>✓ DNS Cache Flushed Successfully!</strong>
            <p>{dnsMessage}</p>
            <small>
              Your network adapter settings were not changed.
            </small>
          </div>
        )}

        {dnsError && (
          <div
            className="dns-error-message"
            role="alert"
            aria-live="assertive"
          >
            <strong>✕ DNS Flush Failed</strong>
            <p>{dnsError}</p>
          </div>
        )}

        <small className="network-repair-help">
          This action requires Windows Administrator permission.
          It does not reset your network adapter or Wi-Fi settings.
        </small>
      </div>
    </div>
  )
}

export default NetworkTroubleshooting
