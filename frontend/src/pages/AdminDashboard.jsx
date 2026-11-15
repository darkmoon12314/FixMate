import React, { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiEdit2, FiTrash2, FiPlus, FiTrendingUp, FiAlertCircle, FiCheckCircle, FiUsers } from 'react-icons/fi'
import { AppContext } from '../App'
import './AdminDashboard.css'

function AdminDashboard() {
  const navigate = useNavigate()
  const { user, issueHistory } = useContext(AppContext)
  const [activeTab, setActiveTab] = useState('overview')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState(null)

  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-dashboard">
        <div className="container">
          <div className="alert alert-error">
            <p>Access Denied: You must be an admin to view this page.</p>
            <button className="btn-primary" onClick={() => navigate('/login')}>
              Login as Admin
            </button>
          </div>
        </div>
      </div>
    )
  }

  const resolvedCount = issueHistory.filter((i) => i.status === 'Resolved').length
  const pendingCount = issueHistory.filter((i) => i.status === 'Pending').length

  const stats = [
    {
      icon: <FiTrendingUp />,
      label: 'Total Issues',
      value: issueHistory.length,
      color: '#3b82f6',
    },
    {
      icon: <FiCheckCircle />,
      label: 'Resolved',
      value: resolvedCount,
      color: '#10b981',
    },
    {
      icon: <FiAlertCircle />,
      label: 'Pending',
      value: pendingCount,
      color: '#f59e0b',
    },
    {
      icon: <FiUsers />,
      label: 'Active Users',
      value: '42',
      color: '#8b5cf6',
    },
  ]

  const openModal = (type) => {
    setModalType(type)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setModalType(null)
  }

  return (
    <div className="admin-dashboard">
      <div className="container">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>
          <p>Manage FixMate system and view analytics</p>
        </div>

        {/* Statistics */}
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card card">
              <div className="stat-icon" style={{ color: stat.color }}>
                {stat.icon}
              </div>
              <div className="stat-content">
                <p className="stat-label">{stat.label}</p>
                <p className="stat-value">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          <div className="tabs-header">
            <button
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`tab-btn ${activeTab === 'issues' ? 'active' : ''}`}
              onClick={() => setActiveTab('issues')}
            >
              Issues
            </button>
            <button
              className={`tab-btn ${activeTab === 'causes' ? 'active' : ''}`}
              onClick={() => setActiveTab('causes')}
            >
              Causes
            </button>
            <button
              className={`tab-btn ${activeTab === 'solutions' ? 'active' : ''}`}
              onClick={() => setActiveTab('solutions')}
            >
              Solutions
            </button>
            <button
              className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              Users
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="tab-content">
              <h2>System Overview</h2>
              <div className="overview-grid">
                <div className="overview-card card">
                  <h3>Recent Activity</h3>
                  <div className="activity-list">
                    {issueHistory.slice(0, 5).map((issue) => (
                      <div key={issue.id} className="activity-item">
                        <span className="activity-date">{issue.date}</span>
                        <span className="activity-text">{issue.category}: {issue.description.substring(0, 40)}...</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overview-card card">
                  <h3>System Status</h3>
                  <div className="status-info">
                    <div className="status-item">
                      <span className="status-label">API Status</span>
                      <span className="status-indicator online">●</span>
                    </div>
                    <div className="status-item">
                      <span className="status-label">Database</span>
                      <span className="status-indicator online">●</span>
                    </div>
                    <div className="status-item">
                      <span className="status-label">Server</span>
                      <span className="status-indicator online">●</span>
                    </div>
                    <div className="status-item">
                      <span className="status-label">Uptime</span>
                      <span className="status-value">99.9%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Issues Tab */}
          {activeTab === 'issues' && (
            <div className="tab-content">
              <div className="tab-title">
                <h2>Manage Issues</h2>
                <button className="btn-primary btn-small" onClick={() => openModal('issue')}>
                  <FiPlus /> Add Issue
                </button>
              </div>
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issueHistory.slice(0, 8).map((issue) => (
                      <tr key={issue.id}>
                        <td>#{issue.id}</td>
                        <td>{issue.category}</td>
                        <td>{issue.description.substring(0, 30)}...</td>
                        <td>
                          <span className={`status-badge ${issue.status.toLowerCase()}`}>
                            {issue.status}
                          </span>
                        </td>
                        <td className="action-buttons">
                          <button className="btn-icon" title="Edit" onClick={() => openModal('issue')}>
                            <FiEdit2 />
                          </button>
                          <button className="btn-icon danger" title="Delete">
                            <FiTrash2 />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Causes Tab */}
          {activeTab === 'causes' && (
            <div className="tab-content">
              <div className="tab-title">
                <h2>Manage Problem Causes</h2>
                <button className="btn-primary btn-small" onClick={() => openModal('cause')}>
                  <FiPlus /> Add Cause
                </button>
              </div>
              <div className="cards-grid">
                <div className="admin-card card">
                  <h3>Slow Computer</h3>
                  <ul>
                    <li>High CPU usage</li>
                    <li>Insufficient RAM</li>
                    <li>Disk full</li>
                  </ul>
                  <div className="card-actions">
                    <button className="btn-icon" onClick={() => openModal('cause')}><FiEdit2 /></button>
                    <button className="btn-icon danger"><FiTrash2 /></button>
                  </div>
                </div>

                <div className="admin-card card">
                  <h3>Network Problem</h3>
                  <ul>
                    <li>Router offline</li>
                    <li>DNS issue</li>
                    <li>Driver problem</li>
                  </ul>
                  <div className="card-actions">
                    <button className="btn-icon" onClick={() => openModal('cause')}><FiEdit2 /></button>
                    <button className="btn-icon danger"><FiTrash2 /></button>
                  </div>
                </div>

                <div className="admin-card card">
                  <h3>Application Crash</h3>
                  <ul>
                    <li>App bug</li>
                    <li>Corrupted files</li>
                    <li>Memory leak</li>
                  </ul>
                  <div className="card-actions">
                    <button className="btn-icon" onClick={() => openModal('cause')}><FiEdit2 /></button>
                    <button className="btn-icon danger"><FiTrash2 /></button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Solutions Tab */}
          {activeTab === 'solutions' && (
            <div className="tab-content">
              <div className="tab-title">
                <h2>Manage Solutions</h2>
                <button className="btn-primary btn-small" onClick={() => openModal('solution')}>
                  <FiPlus /> Add Solution
                </button>
              </div>
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Problem</th>
                      <th>Solution Title</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Slow Computer</td>
                      <td>Clear Temp Files</td>
                      <td><span className="status-badge active">Active</span></td>
                      <td className="action-buttons">
                        <button className="btn-icon" onClick={() => openModal('solution')}><FiEdit2 /></button>
                        <button className="btn-icon danger"><FiTrash2 /></button>
                      </td>
                    </tr>
                    <tr>
                      <td>Network Problem</td>
                      <td>Restart Router</td>
                      <td><span className="status-badge active">Active</span></td>
                      <td className="action-buttons">
                        <button className="btn-icon" onClick={() => openModal('solution')}><FiEdit2 /></button>
                        <button className="btn-icon danger"><FiTrash2 /></button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="tab-content">
              <h2>Active Users</h2>
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Issues Reported</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td><span className="role-badge admin">Admin</span></td>
                      <td>5</td>
                      <td className="action-buttons">
                        <button className="btn-icon" onClick={() => openModal('user')}><FiEdit2 /></button>
                      </td>
                    </tr>
                    <tr>
                      <td>John Doe</td>
                      <td>john@example.com</td>
                      <td><span className="role-badge user">User</span></td>
                      <td>3</td>
                      <td className="action-buttons">
                        <button className="btn-icon" onClick={() => openModal('user')}><FiEdit2 /></button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add/Edit {modalType?.toUpperCase()}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Name/Title</label>
                <input type="text" placeholder="Enter name" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea placeholder="Enter description" rows="4"></textarea>
              </div>
              <div className="modal-actions">
                <button className="btn-primary" onClick={closeModal}>Save</button>
                <button className="btn-outline" onClick={closeModal}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard