import React, { useState, useContext } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FiArrowLeft, FiSend } from 'react-icons/fi'
import { AppContext } from '../App'
import './ProblemReporting.css'

function ProblemReporting() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setCurrentProblem } = useContext(AppContext)

  const categories = [
    { id: 'slow-computer', name: 'Slow Computer' },
    { id: 'network-problem', name: 'Network Problem' },
    { id: 'printer-problem', name: 'Printer Problem' },
    { id: 'app-crash', name: 'Application Crash' },
    { id: 'startup-problem', name: 'Startup Problem' },
    { id: 'security-warning', name: 'Security/Warning' },
    { id: 'hardware-problem', name: 'Hardware Problem' },
    { id: 'other', name: 'Other' },
  ]

  const symptoms = {
    'slow-computer': [
      'Programs take long to open',
      'Computer freezes frequently',
      'High disk usage',
      'High CPU usage',
      'Low memory available',
      'Unresponsive to clicks',
    ],
    'network-problem': [
      'WiFi not connecting',
      'Internet is very slow',
      'Connection drops frequently',
      'DNS not resolving',
      'Pages not loading',
      'Ping very high',
    ],
    'printer-problem': [
      'Printer not recognized',
      'Printing is very slow',
      'Prints blank pages',
      'Paper jam errors',
      'Driver issues',
      'Offline status',
    ],
    'app-crash': [
      'Application crashes on startup',
      'Crashes while using specific feature',
      'Displays error message',
      'Becomes unresponsive',
      'Takes too much memory',
      'Freezes randomly',
    ],
    'startup-problem': [
      'Computer won\'t turn on',
      'Stuck on boot screen',
      'Windows logo stays forever',
      'BIOS error messages',
      'Restart loops',
      'Black screen on startup',
    ],
    'security-warning': [
      'Suspicious popups appearing',
      'Antivirus showing alerts',
      'Browser redirected',
      'Strange ads everywhere',
      'Password prompts',
      'System sounds warning',
    ],
    'hardware-problem': [
      'Device not recognized',
      'USB port not working',
      'Mouse/Keyboard not responding',
      'Display not showing',
      'Speaker no sound',
      'Hardware detection failed',
    ],
    'other': [
      'Multiple issues',
      'Issue not listed',
      'Other problem',
    ],
  }

  const severities = [
    { id: 'low', name: 'Low - Minor inconvenience' },
    { id: 'medium', name: 'Medium - Affects productivity' },
    { id: 'high', name: 'High - System unusable' },
  ]

  const [formData, setFormData] = useState({
    category: searchParams.get('category') || '',
    description: '',
    symptoms: [],
    severity: 'medium',
  })

  const [errors, setErrors] = useState({})

  const handleCategoryChange = (e) => {
    setFormData({ ...formData, category: e.target.value, symptoms: [] })
    setErrors({ ...errors, category: '' })
  }

  const handleSymptomChange = (symptom) => {
    const symptoms = formData.symptoms.includes(symptom)
      ? formData.symptoms.filter((s) => s !== symptom)
      : [...formData.symptoms, symptom]
    setFormData({ ...formData, symptoms })
    setErrors({ ...errors, symptoms: '' })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const newErrors = {}

    if (!formData.category) newErrors.category = 'Please select a category'
    if (!formData.description.trim()) newErrors.description = 'Please describe the problem'
    if (formData.symptoms.length === 0) newErrors.symptoms = 'Please select at least one symptom'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const problem = {
      id: Date.now(),
      ...formData,
      timestamp: new Date(),
    }

    setCurrentProblem(problem)
    navigate('/diagnostic')
  }

  const currentSymptoms = symptoms[formData.category] || []

  return (
    <div className="problem-reporting">
      <div className="container">
        <button className="back-btn" onClick={() => navigate('/')}>
          <FiArrowLeft /> Back to Home
        </button>

        <div className="reporting-card card">
          <div className="reporting-header">
            <h1>Report a Problem</h1>
            <p>Describe your issue and we'll help you fix it</p>
          </div>

          <form onSubmit={handleSubmit} className="reporting-form">
            {/* Category Selection */}
            <div className="form-group">
              <label htmlFor="category">Select Problem Category *</label>
              <select
                id="category"
                value={formData.category}
                onChange={handleCategoryChange}
                className={errors.category ? 'error' : ''}
              >
                <option value="">Choose a category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.category && <span className="error-text">{errors.category}</span>}
            </div>

            {/* Description */}
            <div className="form-group">
              <label htmlFor="description">Describe Your Problem *</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value.slice(0, 500) })
                  setErrors({ ...errors, description: '' })
                }}
                placeholder="Describe what's happening with your computer..."
                maxLength="500"
                className={errors.description ? 'error' : ''}
              />
              <small>{formData.description.length} / 500</small>
              {errors.description && <span className="error-text">{errors.description}</span>}
            </div>

            {/* Symptoms */}
            {formData.category && currentSymptoms.length > 0 && (
              <div className="form-group">
                <label>Select Symptoms (at least one) *</label>
                <div className="symptoms-grid">
                  {currentSymptoms.map((symptom, index) => (
                    <label key={index} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.symptoms.includes(symptom)}
                        onChange={() => handleSymptomChange(symptom)}
                      />
                      <span>{symptom}</span>
                    </label>
                  ))}
                </div>
                {errors.symptoms && <span className="error-text">{errors.symptoms}</span>}
              </div>
            )}

            {/* Severity */}
            <div className="form-group">
              <label htmlFor="severity">Problem Severity *</label>
              <div className="severity-options">
                {severities.map((sev) => (
                  <label key={sev.id} className="radio-label">
                    <input
                      type="radio"
                      name="severity"
                      value={sev.id}
                      checked={formData.severity === sev.id}
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    />
                    <span>{sev.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button type="submit" className="btn-primary">
              <FiSend /> Submit & Start Diagnosis
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ProblemReporting