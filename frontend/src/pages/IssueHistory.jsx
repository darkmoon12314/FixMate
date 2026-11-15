
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiTrash2, FiEye, FiDownload } from 'react-icons/fi'
import { apiFetch } from '../api'
import './IssueHistory.css'

function IssueHistory() {
  const [issueHistory, setIssueHistory] = useState([])
  const [filterStatus, setFilterStatus] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadIssues() {
      setLoading(true)
      setError('')

      try {
        const response = await apiFetch('/issues/me')
        const data = await response.json().catch(() => [])

        if (!response.ok) {
          throw new Error(
            data.message ||
            (response.status === 401
              ? 'Session expired. Please log in again.'
              : 'Unable to load issue history.')
          )
        }

        if (!cancelled) {
          setIssueHistory(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to connect to the server.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadIssues()

    return () => {
      cancelled = true
    }
  }, [])

  const getStatus = (issue) => {
    if (issue.status === 'Resolved') return 'Resolved'
    if (issue.status === 'Open' || issue.status === 'Pending') {
      return 'Pending'
    }
    return issue.status || 'Pending'
  }

  const filteredHistory =
    filterStatus === 'All'
      ? issueHistory
      : issueHistory.filter(
          (issue) => getStatus(issue) === filterStatus
        )

  const handleDeleteIssue = async (issue) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete this ${issue.category || 'issue'}? This action cannot be undone.`
    )

    if (!confirmed) return

    setDeletingId(issue.id)
    setError('')

    try {
      const response = await apiFetch(`/issues/${issue.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(
          data.message || `Unable to delete issue (HTTP ${response.status})`
        )
      }

      setIssueHistory((previous) =>
        previous.filter((item) => item.id !== issue.id)
      )
    } catch (err) {
      window.alert(err.message || 'Could not delete this issue.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleExportData = () => {
    const dataBlob = new Blob(
      [JSON.stringify(issueHistory, null, 2)],
      { type: 'application/json' }
    )

    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'fixmate-history.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  const getShortText = (text, length) => {
    if (!text) return 'N/A'
    if (text.length <= length) return text
    return `${text.substring(0, length)}...`
  }

  const formatDate = (issue) => {
    const value = issue.createdAt || issue.date
    if (!value) return 'N/A'

    const date = new Date(value)
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString()
  }

  const handleViewDetails = (issue) => {
    window.alert(
      `Details:\n\n` +
      `Description: ${issue.description || 'N/A'}\n\n` +
      `Diagnosis: ${issue.diagnosis || 'N/A'}\n\n` +
      `Solution: ${issue.solution || 'N/A'}`
    )
  }

  if (loading) {
    return (
      <div className="issue-history">
        <div className="container">
          <div className="history-header">
            <h1>Issue History</h1>
            <p>Loading your reported problems...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="issue-history">
        <div className="container">
          <div className="history-header">
            <h1>Issue History</h1>
          </div>
          <div className="empty-state card">
            <h2>Unable to Load History</h2>
            <p>{error}</p>
            <button
              className="btn-primary"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="issue-history">
      <div className="container">
        <div className="history-header">
          <h1>Issue History</h1>
          <p>
            View all your reported problems and their solutions
          </p>
        </div>

        {issueHistory.length > 0 ? (
          <>
            <div className="history-controls">
              <div className="filter-buttons">
                {['All', 'Resolved', 'Pending'].map((status) => (
                  <button
                    key={status}
                    className={`filter-btn ${
                      filterStatus === status ? 'active' : ''
                    }`}
                    onClick={() => setFilterStatus(status)}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <button
                className="btn-secondary"
                onClick={handleExportData}
              >
                <FiDownload />
                Export Data
              </button>
            </div>

            {filteredHistory.length > 0 ? (
              <div className="issues-table-wrapper">
                <table className="issues-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Diagnosis</th>
                      <th>Solution</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredHistory.map((issue) => {
                      const status = getStatus(issue)

                      return (
                        <tr key={issue.id}>
                          <td>{formatDate(issue)}</td>

                          <td>
                            <span className="category-badge">
                              {issue.category || 'Other'}
                            </span>
                          </td>

                          <td className="description-cell">
                            {getShortText(issue.description, 50)}
                          </td>

                          <td>
                            {getShortText(issue.diagnosis, 30)}
                          </td>

                          <td>
                            {getShortText(issue.solution, 30)}
                          </td>

                          <td>
                            <span
                              className={`status-badge ${
                                status === 'Resolved'
                                  ? 'resolved'
                                  : 'pending'
                              }`}
                            >
                              {status}
                            </span>
                          </td>

                          <td className="actions-cell">
                            <button
                              className="action-btn"
                              title="View Details"
                              onClick={() => handleViewDetails(issue)}
                            >
                              <FiEye />
                            </button>

                            <button
                              className="action-btn danger"
                              title="Delete"
                              disabled={deletingId === issue.id}
                              onClick={() => handleDeleteIssue(issue)}
                            >
                              <FiTrash2 />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <p>No issues found with this filter.</p>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state card">
            <div className="empty-icon">📋</div>
            <h2>No Issues Yet</h2>
            <p>
              You haven't reported any problems yet.
              Start by reporting a problem.
            </p>
            <Link to="/report-problem" className="btn-primary">
              Report a Problem
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default IssueHistory
