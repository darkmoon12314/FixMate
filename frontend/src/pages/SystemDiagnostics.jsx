
import { useState, useContext, useEffect } from 'react'
import { AppContext } from '../App'
import { apiFetch } from '../api'

import {
  FiCpu,
  FiHardDrive,
  FiActivity,
  FiCheckCircle,
  FiAlertTriangle,
  FiRefreshCw,
  FiShield,
  FiClock,
  FiDatabase,
} from 'react-icons/fi'

import './SystemDiagnostics.css'

const REPORT_VALIDITY_HOURS = 24

function SystemDiagnostics() {
  const {
    systemReport,
    setSystemReport,
    systemReportCreatedAt,
    setSystemReportCreatedAt,
  } = useContext(AppContext)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [usePreviousReport, setUsePreviousReport] = useState(false)
  const [processLoading, setProcessLoading] = useState(false)
  const [processError, setProcessError] = useState('')
  const [processData, setProcessData] = useState(null)

  // Restore previous report from current browser tab
  useEffect(() => {
    if (!systemReport) {
      try {
        const savedReport = sessionStorage.getItem('fixmateSystemReport')

        if (savedReport) {
          setSystemReport(JSON.parse(savedReport))
        }
      } catch (err) {
        console.error('Unable to restore diagnostic report:', err)
        sessionStorage.removeItem('fixmateSystemReport')
      }
    }
  }, [systemReport, setSystemReport])

  // Save report in current browser tab
  useEffect(() => {
    if (systemReport) {
      sessionStorage.setItem(
        'fixmateSystemReport',
        JSON.stringify(systemReport)
      )
    }
  }, [systemReport])

  // Calculate report freshness
  const getReportAge = () => {
    if (!systemReport || !systemReportCreatedAt) {
      return null
    }

    const scanDate = new Date(systemReportCreatedAt)
    const currentDate = new Date()

    if (Number.isNaN(scanDate.getTime())) {
      return null
    }

    const ageMilliseconds = currentDate.getTime() - scanDate.getTime()

    return ageMilliseconds / (1000 * 60 * 60)
  }

  const reportAgeHours = getReportAge()

  const hasValidTimestamp =
    reportAgeHours !== null && reportAgeHours >= 0

  const isFreshReport =
    hasValidTimestamp &&
    reportAgeHours <= REPORT_VALIDITY_HOURS

  const formattedScanDate = systemReportCreatedAt
    ? new Date(systemReportCreatedAt).toLocaleString()
    : 'Date unavailable'

  // Analyse system measurements
  const analyseSystem = (data) => {
    const findings = []
    let healthScore = 100

    const cpu = data.cpu.usagePercent
    const ram = data.memory.usagePercent
    const diskFree = data.disk.freeGB
    const diskUsage = data.disk.usagePercent

    if (cpu >= 90) {
      findings.push({
        title: 'Very High CPU Usage',
        message: 'Your processor is under heavy load.',
        recommendation: 'Check Task Manager and close unnecessary applications.',
        severity: 'High',
      })
      healthScore -= 30
    } else if (cpu >= 75) {
      findings.push({
        title: 'High CPU Usage',
        message: 'Your processor usage is elevated.',
        recommendation: 'Check which applications are consuming CPU resources.',
        severity: 'Medium',
      })
      healthScore -= 15
    }

    if (ram >= 90) {
      findings.push({
        title: 'Critical Memory Usage',
        message: 'Your system memory is almost full.',
        recommendation: 'Close unnecessary applications and browser tabs.',
        severity: 'High',
      })
      healthScore -= 30
    } else if (ram >= 80) {
      findings.push({
        title: 'High Memory Usage',
        message: 'Your computer is using a large amount of RAM.',
        recommendation: 'Review running applications and reduce unnecessary background activity.',
        severity: 'Medium',
      })
      healthScore -= 15
    }

    if (diskFree < 5) {
      findings.push({
        title: 'Critical Low Disk Space',
        message: 'Very little storage space is available.',
        recommendation: 'Review large files and use Windows Storage settings to free space safely.',
        severity: 'High',
      })
      healthScore -= 30
    } else if (diskFree < 15 || diskUsage >= 90) {
      findings.push({
        title: 'Low Disk Space',
        message: 'Your drive is running low on available storage.',
        recommendation: 'Review temporary files and unused applications before removing anything.',
        severity: 'Medium',
      })
      healthScore -= 15
    }

    healthScore = Math.max(0, healthScore)

    let overallStatus = 'Healthy'

    if (healthScore < 50) {
      overallStatus = 'Critical'
    } else if (healthScore < 80) {
      overallStatus = 'Needs Attention'
    }

    if (findings.length === 0) {
      findings.push({
        title: 'No Major Issues Detected',
        message: 'CPU, memory and storage are within the configured thresholds.',
        recommendation: 'Continue monitoring your system and keep Windows and applications updated.',
        severity: 'Normal',
      })
    }

    return {
      healthScore,
      overallStatus,
      findings,
    }
  }

  const analysis =
    systemReport && usePreviousReport
      ? analyseSystem(systemReport)
      : null

  // Use the saved diagnostic report
  const handleUsePreviousReport = () => {
    if (!systemReport) {
      setError('No previous diagnostic report is available.')
      return
    }

    setError('')
    setSaveMessage('')
    setUsePreviousReport(true)
  }

  // Send authenticated requests to the local Python Agent using the
  // JWT issued by the Spring Boot backend.
  const agentRequest = async (endpoint) => {
    const jwt = localStorage.getItem('fixmateToken')

    if (!jwt) {
      throw new Error('Please log in again before using system diagnostics.')
    }

    let response

    try {
      response = await fetch(`http://127.0.0.1:8765${endpoint}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: 'application/json',
        },
      })
    } catch {
      throw new Error(
        'Unable to connect to the FixMate Local Agent. Make sure it is running.'
      )
    }

    let data = {}

    try {
      data = await response.json()
    } catch {
      // Keep an empty response object when the Agent returns no JSON.
    }

    if (response.status === 401) {
      throw new Error('Your login session is invalid or expired. Please log in again.')
    }

    if (!response.ok) {
      throw new Error(
        data.detail || data.message || 'The local diagnostic request failed.'
      )
    }

    return data
  }

  // Run a new system scan and save it to MySQL
  const runDiagnostics = async () => {
    setLoading(true)
    setError('')
    setSaveMessage('')

    try {
      // Step 1: Collect the system report from the authenticated Python Agent.
      const data = await agentRequest('/api/diagnostics/system')

      if (!data.report) {
        throw new Error('The diagnostic report was not received.')
      }

      // Step 2: Save the new report to Spring Boot / MySQL.
      const saveResponse = await apiFetch('/diagnostics', {
        method: 'POST',
        body: JSON.stringify({
          reportJson: JSON.stringify(data.report),
        }),
      })

      if (!saveResponse.ok) {
        let saveError = 'Unable to save diagnostic report.'

        try {
          const errorData = await saveResponse.json()
          saveError = errorData.message || saveError
        } catch {
          // Keep the default error message.
        }

        throw new Error(saveError)
      }

      // Step 3: Read the saved database record.
      const savedDiagnostic = await saveResponse.json()

      if (!savedDiagnostic.createdAt) {
        throw new Error(
          'Report saved, but its database timestamp was not received.'
        )
      }

      // Step 4: Update React state only after successful database save.
      setSystemReport(data.report)
      setSystemReportCreatedAt(savedDiagnostic.createdAt)
      setUsePreviousReport(true)

      setSaveMessage(
        'New system diagnostic report successfully saved to your account.'
      )
    } catch (err) {
      console.error('System diagnostic error:', err)
      setError(
        err.message || 'Unable to complete system diagnostics.'
      )
    } finally {
      setLoading(false)
    }
  }

  // Run a separate, read-only process scan through the Python Agent.
  const runProcessDiagnostics = async () => {
    setProcessLoading(true)
    setProcessError('')

    try {
      const data = await agentRequest('/api/diagnostics/processes')

      if (
        !data.success ||
        !Array.isArray(data.topCpuProcesses) ||
        !Array.isArray(data.topMemoryProcesses)
      ) {
        throw new Error('The process diagnostic response is incomplete.')
      }

      setProcessData(data)
    } catch (err) {
      console.error('Process diagnostic error:', err)
      setProcessError(
        err.message || 'Unable to complete process diagnostics.'
      )
    } finally {
      setProcessLoading(false)
    }
  }

  // Analyse process readings using metadata supplied by the Python Agent.
  // Windows system processes and FixMate itself are shown in the tables,
  // but are not treated as ordinary application warnings.
  const analyseProcesses = (data) => {
    const findingsByPid = new Map()
    let ignoredWindowsProcesses = 0

    const getRecommendation = (process, metrics) => {
      const name = (process.name || 'Unknown').toLowerCase()
      const hasHighCpu = metrics.cpuPercent >= 70
      const hasHighRam = metrics.memoryPercent >= 15

      if (hasHighCpu && hasHighRam) {
        return 'This application is using a high amount of both CPU and RAM. Check whether it is performing an expected task. Save your work before closing it normally if you no longer need it.'
      }

      if (hasHighCpu) {
        if (name.includes('chrome') || name.includes('msedge') || name.includes('firefox')) return 'Review browser tabs and extensions. Check for a tab or extension performing intensive work, and close only items you no longer need.'
        if (name.includes('code.exe')) return 'Check active builds, extensions and language servers. Stop only tasks you started and no longer need.'
        if (name.includes('python')) return 'Check the running Python script or notebook for intensive tasks. Stop it only if you recognise it and no longer need it.'
        if (name.includes('roblox') || name.includes('game')) return 'Check in-game graphics settings and background recording. Close the game normally if you are finished playing.'
        return 'Check whether this application is performing an expected task. Save your work before closing it normally, if it is no longer needed.'
      }

      if (hasHighRam) {
        if (name.includes('chrome') || name.includes('msedge') || name.includes('firefox')) return 'Review open browser tabs and extensions. Close only tabs you no longer need.'
        if (name.includes('code.exe')) return 'Review open workspaces and extensions. Close unused VS Code windows after saving your work.'
        if (name.includes('python')) return 'Check whether multiple scripts or notebooks are running. Stop only scripts you recognise and no longer need.'
        return 'Review whether this application is needed right now. Save your work before closing it normally.'
      }

      return 'This application crossed an attention threshold in the latest snapshot. Check whether its resource usage is expected and compare with another scan before taking action.'
    }

    const inspect = (processes, metric) => {
      processes.forEach((process) => {
        if (process.isFixMateAgent || process.category === 'FixMate Agent') return

        const isWindowsProcess =
          Boolean(process.isWindowsSystem) ||
          (process.category || '').toLowerCase().startsWith('windows')

        // Windows processes remain visible in the tables, not application warnings.
        if (isWindowsProcess) {
          ignoredWindowsProcesses += 1
          return
        }

        const value = Number(
          metric === 'CPU' ? process.cpuPercent : process.memoryPercent
        )

        if (!Number.isFinite(value) || value < 0) return

        // Heuristic thresholds: CPU is normalized; RAM is a share of total RAM.
        const mediumThreshold = metric === 'CPU' ? 40 : 8
        const highThreshold = metric === 'CPU' ? 70 : 15
        if (value < mediumThreshold) return

        const key = String(process.pid ?? process.name ?? 'unknown')
        const name = process.name || 'Unknown'
        const severity = value >= highThreshold ? 'High' : 'Medium'

        if (!findingsByPid.has(key)) {
          findingsByPid.set(key, {
            id: `PROCESS-${key}`,
            name,
            pid: process.pid,
            category: process.category || 'Application',
            description: process.description || '',
            cpuPercent: null,
            memoryPercent: null,
            severity: 'Medium',
          })
        }

        const finding = findingsByPid.get(key)
        finding[metric === 'CPU' ? 'cpuPercent' : 'memoryPercent'] = value
        if (severity === 'High') finding.severity = 'High'
      })
    }

    inspect(data.topCpuProcesses || [], 'CPU')
    inspect(data.topMemoryProcesses || [], 'RAM')

    const findings = Array.from(findingsByPid.values()).map((finding) => {
      const metrics = {
        cpuPercent: finding.cpuPercent ?? 0,
        memoryPercent: finding.memoryPercent ?? 0,
      }

      const activeMetrics = []
      if (finding.cpuPercent !== null) activeMetrics.push(`CPU ${finding.cpuPercent.toFixed(2)}%`)
      if (finding.memoryPercent !== null) activeMetrics.push(`RAM ${finding.memoryPercent.toFixed(2)}%`)

      return {
        ...finding,
        title: `${finding.severity} resource usage: ${finding.name}`,
        message: `${finding.name} recorded ${activeMetrics.join(' and ')} in the latest process snapshot.`,
        recommendation: getRecommendation(finding, metrics),
      }
    })

    return {
      findings: findings.sort((a, b) => {
        const severityOrder = { High: 0, Medium: 1 }
        return severityOrder[a.severity] - severityOrder[b.severity] ||
          Math.max(b.cpuPercent || 0, b.memoryPercent || 0) -
          Math.max(a.cpuPercent || 0, a.memoryPercent || 0)
      }),
      ignoredWindowsProcesses,
    }
  }

  const processAnalysis = processData
    ? analyseProcesses(processData)
    : { findings: [], ignoredWindowsProcesses: 0 }

  const processFindings = processAnalysis.findings

  const ProcessTable = ({ title, processes, metricKey, metricLabel }) => (
    <div className="system-info-card" style={{ minWidth: 0 }}>
      <h3>{title}</h3>
      {processes.length === 0 ? (
        <p>No process data is available.</p>
      ) : (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
            <thead>
              <tr>
                {['Process', 'Category', 'PID', metricLabel].map((heading) => (
                  <th key={heading} style={{ textAlign: 'left', padding: '12px 10px', borderBottom: '1px solid #d1d5db' }}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {processes.map((process, index) => (
                <tr key={`${process.pid}-${index}`}>
                  <td title={process.description || process.name} style={{ padding: '11px 10px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>
                    {process.name}
                    {process.isFixMateAgent && (
                      <span style={{ display: 'block', fontSize: '12px', fontWeight: 400, opacity: 0.75 }}>
                        This diagnostic app
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '11px 10px', borderBottom: '1px solid #e5e7eb' }}>
                    {process.category || 'Unclassified'}
                  </td>
                  <td style={{ padding: '11px 10px', borderBottom: '1px solid #e5e7eb' }}>
                    {process.pid}
                  </td>
                  <td style={{ padding: '11px 10px', borderBottom: '1px solid #e5e7eb' }}>
                    {Number(process[metricKey] || 0).toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  const MetricCard = ({ title, value, status, details, icon }) => (
    <div className="diagnostic-card">
      <div className="metric-heading">
        {icon}
        <h3>{title}</h3>
      </div>

      <div className="metric-value">{value}</div>
      <p className="metric-details">{details}</p>
      <span className="metric-status">{status}</span>
    </div>
  )

  return (
    <div className="diagnostics-page">

      {/* Page Header */}
      <div className="diagnostics-header">
        <div>
          <p className="diagnostics-label">
            FIXMATE INTELLIGENT SYSTEM MONITOR
          </p>

          <h1>System Diagnostics</h1>

          <p>
            Analyse your computer performance and identify possible issues.
          </p>
        </div>

        <button
          className="diagnostics-button"
          onClick={runDiagnostics}
          disabled={loading}
        >
          <FiRefreshCw />
          {loading ? 'Scanning...' : 'Run New Scan'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="diagnostics-error">
          {error}
        </div>
      )}

      {/* Database Save Message */}
      {saveMessage && (
        <div className="diagnostics-success">
          <FiCheckCircle />
          {saveMessage}
        </div>
      )}

      {/* Separate Process Monitor */}
      <section className="analysis-section" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h2><FiActivity /> Process Monitor</h2>
            <p className="section-description">
              View the top CPU- and RAM-consuming processes currently running on this computer.
            </p>
          </div>
          <button
            type="button"
            className="diagnostics-button"
            onClick={runProcessDiagnostics}
            disabled={processLoading}
          >
            <FiRefreshCw />
            {processLoading ? 'Scanning Processes...' : processData ? 'Scan Processes Again' : 'Scan Processes'}
          </button>
        </div>

        {processError && (
          <div className="diagnostics-error" role="alert" style={{ marginTop: '16px' }}>
            {processError}
          </div>
        )}

        {processData && (
          <>
            <p style={{ marginTop: '16px' }}>
              <strong>Processes detected:</strong> {processData.totalProcesses}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '18px', marginTop: '16px' }}>
              <ProcessTable
                title="Top 10 CPU Processes"
                processes={processData.topCpuProcesses}
                metricKey="cpuPercent"
                metricLabel="CPU Usage"
              />
              <ProcessTable
                title="Top 10 RAM Processes"
                processes={processData.topMemoryProcesses}
                metricKey="memoryPercent"
                metricLabel="RAM Usage"
              />
            </div>
            {/* Rule-based process analysis and safe recommendations */}
            <div className="analysis-section" style={{ marginTop: '22px' }}>
              <h2>Process Analysis &amp; Recommendations</h2>
              <p className="section-description">
                Findings focus on ordinary applications that cross the configured CPU or RAM attention thresholds. Windows system processes and FixMate's own agent remain visible in the tables but are not reported as application faults. A single application is shown once even if both CPU and RAM need attention.
              </p>

              {processFindings.length === 0 ? (
                <div className="finding-card">
                  <div className="finding-heading">
                    <FiCheckCircle />
                    <h3>No high process usage detected</h3>
                    <span className="severity normal">Normal</span>
                  </div>
                  <p>No ordinary application crossed the configured CPU or RAM attention thresholds in this scan. Windows system processes and FixMate's own agent are excluded from application warnings.</p>
                </div>
              ) : (
                processFindings.map((finding) => (
                  <div className="finding-card" key={finding.id}>
                    <div className="finding-heading">
                      {finding.severity === 'High'
                        ? <FiAlertTriangle />
                        : <FiActivity />}
                      <h3>{finding.title}</h3>
                      <span className={`severity ${finding.severity.toLowerCase()}`}>
                        {finding.severity}
                      </span>
                    </div>

                    <p>{finding.message}</p>
                    <p>
                      <strong>Category:</strong> {finding.category}
                      {' · '}
                      <strong>Process ID:</strong> {finding.pid}
                    </p>
                    {finding.description && <p>{finding.description}</p>}

                    <div className="recommendation">
                      <strong>Recommended Action:</strong>
                      <p>{finding.recommendation}</p>
                    </div>
                  </div>
                ))
              )}
              {processAnalysis.ignoredWindowsProcesses > 0 && (
                <p className="section-description" style={{ marginTop: '12px' }}>
                  Windows system and service processes were excluded from application warnings ({processAnalysis.ignoredWindowsProcesses} process entries checked).
                </p>
              )}
            </div>

            <p className="section-description" style={{ marginTop: '12px' }}>
              CPU percentages are normalized across logical CPU cores. Readings are short-duration snapshots and may fluctuate. RAM percentages represent a share of total physical memory. FixMate only reads this information and does not close or modify processes.
            </p>
          </>
        )}
      </section>

      {/* Previous Report Selection */}
      {systemReport && (
        <div className="system-info-card">

          <h2>
            <FiDatabase /> Previous Diagnostic Report
          </h2>

          <p>
            <strong>Last Scan:</strong> {formattedScanDate}
          </p>

          <p>
            <strong>Report Age:</strong>{' '}
            {hasValidTimestamp
              ? `${reportAgeHours.toFixed(1)} hours`
              : 'Unknown'}
          </p>

          <div
            style={{
              marginTop: '15px',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: isFreshReport ? '#dcfce7' : '#fef3c7',
              color: isFreshReport ? '#166534' : '#92400e',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            {isFreshReport ? (
              <>
                <FiCheckCircle />
                <strong>Fresh Report</strong>
                <span> - Your report is within 24 hours.</span>
              </>
            ) : (
              <>
                <FiAlertTriangle />
                <strong>Outdated Report</strong>
                <span>
                  - A new system scan is recommended.
                </span>
              </>
            )}
          </div>

          <p style={{ marginTop: '12px' }}>
            Would you like to use your previous report or collect new system measurements?
          </p>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              marginTop: '15px',
            }}
          >
            <button
              type="button"
              onClick={handleUsePreviousReport}
              disabled={loading}
              className="diagnostics-button"
            >
              <FiDatabase />
              Use Previous Report
            </button>

            <button
              type="button"
              onClick={runDiagnostics}
              disabled={loading}
              className="diagnostics-button"
            >
              <FiRefreshCw />
              {loading ? 'Scanning...' : 'Run New Scan'}
            </button>
          </div>

        </div>
      )}

      {/* No Previous Report */}
      {!systemReport && !loading && (
        <div className="diagnostics-empty">
          <FiShield size={42} />

          <h2>Ready to scan your system?</h2>

          <p>
            No previous diagnostic report was found for your account.
          </p>

          <p>
            Run a new scan to check CPU, memory and disk performance.
          </p>
        </div>
      )}

      {/* Previous Report Measurements */}
      {systemReport && usePreviousReport && analysis && (
        <>
          <div className="system-info-card">
            <h2>System Information</h2>

            <p>
              <strong>Operating System:</strong>{' '}
              {systemReport.operatingSystem}
            </p>

            <p>
              <strong>Processor:</strong>{' '}
              {systemReport.processor}
            </p>
          </div>

          {/* Overall Health */}
          <div className="health-card">
            <div>
              <p className="diagnostics-label">
                OVERALL SYSTEM HEALTH
              </p>

              <h2>{analysis.overallStatus}</h2>

              <p>
                Based on saved CPU, RAM and disk measurements.
              </p>
            </div>

            <div className="health-score">
              <span>{analysis.healthScore}</span>
              <small>/ 100</small>
            </div>
          </div>

          {/* CPU, RAM and Disk */}
          <div className="diagnostics-grid">

            <MetricCard
              title="CPU Usage"
              value={`${systemReport.cpu.usagePercent}%`}
              status={systemReport.cpu.status}
              details="Processor usage at the time of scan"
              icon={<FiCpu />}
            />

            <MetricCard
              title="RAM Usage"
              value={`${systemReport.memory.usagePercent}%`}
              status={systemReport.memory.status}
              details={`${systemReport.memory.usedGB} GB used of ${systemReport.memory.totalGB} GB`}
              icon={<FiActivity />}
            />

            <MetricCard
              title="Disk Usage"
              value={`${systemReport.disk.usagePercent}%`}
              status={systemReport.disk.status}
              details={`${systemReport.disk.freeGB} GB free of ${systemReport.disk.totalGB} GB on ${systemReport.disk.drive}`}
              icon={<FiHardDrive />}
            />

          </div>

          {/* Diagnostic Findings */}
          <div className="analysis-section">
            <h2>Diagnostic Findings</h2>

            <p className="section-description">
              Analysis based on predefined system health rules.
            </p>

            {analysis.findings.map((finding, index) => (
              <div className="finding-card" key={index}>

                <div className="finding-heading">

                  {finding.severity === 'Normal' ? (
                    <FiCheckCircle />
                  ) : (
                    <FiAlertTriangle />
                  )}

                  <h3>{finding.title}</h3>

                  <span
                    className={`severity ${finding.severity.toLowerCase()}`}
                  >
                    {finding.severity}
                  </span>

                </div>

                <p>{finding.message}</p>

                <div className="recommendation">
                  <strong>Recommended Action:</strong>

                  <p>{finding.recommendation}</p>
                </div>

              </div>
            ))}
          </div>

          <div className="diagnostics-success">
            <FiCheckCircle />
            Previous system diagnostic report loaded successfully.
          </div>
        </>
      )}

      {/* Report Exists But User Has Not Selected It */}
      {systemReport && !usePreviousReport && (
        <div className="diagnostics-empty">
          <FiClock size={42} />

          <h2>Previous Report Available</h2>

          <p>
            Select Use Previous Report to view the saved measurements,
            or run a new scan to collect updated information.
          </p>
        </div>
      )}

    </div>
  )
}

export default SystemDiagnostics
