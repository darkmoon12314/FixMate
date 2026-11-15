
import React, { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  FiArrowLeft,
  FiArrowRight,
  FiRotateCcw,
  FiRefreshCw,
  FiDatabase,
  FiShield,
  FiCheckCircle,
} from 'react-icons/fi'

import { AppContext } from '../App'
import { apiFetch } from '../api'

import './DiagnosticQuestions.css'

const REPORT_VALIDITY_HOURS = 24

function DiagnosticQuestions() {
  const navigate = useNavigate()

  const {
    currentProblem,
    setCurrentProblem,
    systemReport,
    setSystemReport,
    systemReportCreatedAt,
    setSystemReportCreatedAt,
  } = useContext(AppContext)

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [showSystemOptions, setShowSystemOptions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Diagnostic questions for all 8 categories
  const diagnosticQuestions = {
    'slow-computer': [
      {
        id: 'q1',
        question: 'When did the slowness start?',
        options: ['Today', 'This week', 'This month', 'Gradually over time'],
      },
      {
        id: 'q2',
        question: 'Is the slowness affecting all programs or specific ones?',
        options: ['All programs slow', 'Specific programs slow', 'Only web browser slow', 'Only during startup'],
      },
      {
        id: 'q3',
        question: 'Have you checked Task Manager/Activity Monitor for high resource usage?',
        options: ['CPU usage is very high', 'Memory usage is very high', 'Disk usage is very high', 'No, not checked'],
      },
      {
        id: 'q4',
        question: 'Have you installed new software or updates recently?',
        options: ['Yes, new software installed', 'Yes, system updates installed', 'No', 'Not sure'],
      },
      {
        id: 'q5',
        question: 'How much free disk space is available on your drive?',
        options: ['Less than 5%', '5-10%', '10-20%', 'More than 20%'],
      },
    ],

    'network-problem': [
      {
        id: 'q1',
        question: 'What type of connection are you using?',
        options: ['WiFi', 'Ethernet cable', 'Mobile hotspot', '4G/5G network'],
      },
      {
        id: 'q2',
        question: 'Are other devices on the same network having the same problem?',
        options: ['Yes, all devices affected', 'No, only this device', 'Not sure', 'No other devices to test'],
      },
      {
        id: 'q3',
        question: 'Is your router/modem turned on and showing lights?',
        options: ['Yes, lights are on', 'No, no lights', 'Lights are red', 'Not sure'],
      },
      {
        id: 'q4',
        question: 'Can you see your WiFi network in the available networks list?',
        options: ['Yes, but can\'t connect', 'Yes, and connected but no internet', 'Network not visible', 'Using Ethernet'],
      },
      {
        id: 'q5',
        question: 'Have you tried restarting your router or modem?',
        options: ['Yes, still not working', 'No, not yet', 'Yes, it worked temporarily', 'Yes, it fixed the problem'],
      },
    ],

    'printer-problem': [
      {
        id: 'q1',
        question: 'Is the printer turned on and showing any lights?',
        options: ['On and ready', 'On but no lights', 'Off completely', 'Shows error light'],
      },
      {
        id: 'q2',
        question: 'How is the printer connected to your computer?',
        options: ['USB cable', 'WiFi/Network', 'Bluetooth', 'Not sure'],
      },
      {
        id: 'q3',
        question: 'Does the printer appear in your device list or printers list?',
        options: ['Yes, recognized', 'No, not showing', 'Showing but offline', 'Not checked'],
      },
      {
        id: 'q4',
        question: 'When you try to print, what happens?',
        options: ['Nothing happens', 'Error message appears', 'Prints but quality is poor', 'Printer shows offline'],
      },
      {
        id: 'q5',
        question: 'Is the printer out of paper, ink, or showing toner low warning?',
        options: ['Out of paper', 'No ink/toner', 'Low on supplies', 'Paper jam', 'All supplies OK'],
      },
    ],

    'app-crash': [
      {
        id: 'q1',
        question: 'When does the application crash?',
        options: ['On startup/opening', 'During a specific action', 'Randomly', 'When system is low on resources'],
      },
      {
        id: 'q2',
        question: 'Is the application up to date?',
        options: ['Yes, latest version', 'No, outdated', 'Not sure', 'Can\'t find updates'],
      },
      {
        id: 'q3',
        question: 'Do you see an error message when the app crashes?',
        options: ['Yes, specific error code', 'Generic error message', 'No error, just closes', 'Freezes without message'],
      },
      {
        id: 'q4',
        question: 'Have you tried uninstalling and reinstalling the application?',
        options: ['Yes, still crashes', 'No, not yet', 'Yes, it worked', 'Can\'t reinstall'],
      },
      {
        id: 'q5',
        question: 'Does the app crash on other user accounts or only this one?',
        options: ['Only this account', 'All accounts affected', 'Not tested', 'Only account available'],
      },
    ],

    'startup-problem': [
      {
        id: 'q1',
        question: 'What happens when you turn on the computer?',
        options: ['Nothing, won\'t start', 'Stuck on loading screen', 'Shows Windows logo then freezes', 'Restart loops'],
      },
      {
        id: 'q2',
        question: 'Do you hear any beep sounds or see LED lights when powering on?',
        options: ['Yes, normal boot sounds', 'Unusual beeping sounds', 'No sounds at all', 'Only lights, no beeps'],
      },
      {
        id: 'q3',
        question: 'Can you access the BIOS/UEFI settings or safe mode?',
        options: ['Yes, BIOS works', 'Yes, safe mode works', 'No, can\'t access', 'Not sure how to try'],
      },
      {
        id: 'q4',
        question: 'Have you made any recent hardware changes or installations?',
        options: ['Yes, new hardware added', 'Yes, removed hardware', 'No recent changes', 'Not sure'],
      },
      {
        id: 'q5',
        question: 'Is there a power issue or does the monitor show anything?',
        options: ['Power off immediately', 'Black screen completely', 'Monitor shows signal', 'Only fan runs'],
      },
    ],

    'security-warning': [
      {
        id: 'q1',
        question: 'What type of security alert are you seeing?',
        options: ['Antivirus warning', 'Browser security warning', 'Windows Defender alert', 'Suspicious popup'],
      },
      {
        id: 'q2',
        question: 'Where is the warning appearing?',
        options: ['System tray notification', 'Full-screen warning', 'In web browser', 'Taskbar notification'],
      },
      {
        id: 'q3',
        question: 'Did this appear after visiting a specific website or downloading something?',
        options: ['Yes, after downloading', 'Yes, after website visit', 'Appeared randomly', 'Not sure when started'],
      },
      {
        id: 'q4',
        question: 'Is your antivirus/security software up to date?',
        options: ['Yes, current', 'No, outdated', 'Not sure', 'No antivirus installed'],
      },
    ],

    'hardware-problem': [
      {
        id: 'q1',
        question: 'Which hardware device is not working?',
        options: ['USB device', 'Mouse/Keyboard', 'Monitor/Display', 'Audio/Speakers', 'Network card'],
      },
      {
        id: 'q2',
        question: 'When did this hardware stop working?',
        options: ['Just now suddenly', 'After an update', 'After a crash', 'Gradually over time'],
      },
      {
        id: 'q3',
        question: 'Does the device appear in Device Manager or System Information?',
        options: ['Yes, recognized', 'No, not showing', 'Shows with error mark', 'Not checked'],
      },
      {
        id: 'q4',
        question: 'Have you checked if drivers are installed and updated?',
        options: ['Yes, drivers are updated', 'No drivers installed', 'Outdated drivers', 'Not sure how to check'],
      },
      {
        id: 'q5',
        question: 'Have you tested the device on another computer?',
        options: ['Yes, works on other PC', 'Yes, doesn\'t work anywhere', 'No, haven\'t tested', 'Can\'t test'],
      },
    ],

    other: [
      {
        id: 'q1',
        question: 'How long have you been experiencing this issue?',
        options: ['Less than 1 hour', 'Less than 1 day', 'Less than 1 week', 'More than 1 week'],
      },
      {
        id: 'q2',
        question: 'Have you made any recent changes to your system?',
        options: ['Installed new software', 'Updated system/drivers', 'Made hardware changes', 'No recent changes'],
      },
      {
        id: 'q3',
        question: 'Is the issue affecting your work or daily computer use?',
        options: ['Severely blocking work', 'Somewhat affecting productivity', 'Minor inconvenience', 'No real impact'],
      },
      {
        id: 'q4',
        question: 'Have you tried any troubleshooting steps yet?',
        options: ['Yes, already tried fixes', 'No, don\'t know where to start', 'Only basic restart', 'Not sure what to try'],
      },
    ],
  }

  if (!currentProblem) {
    return (
      <div className="diagnostic-container">
        <div className="container">
          <div className="alert alert-error">
            <p>No problem reported yet. Please report a problem first.</p>

            <button
              className="btn-primary"
              onClick={() => navigate('/report-problem')}
            >
              Report a Problem
            </button>
          </div>
        </div>
      </div>
    )
  }

  const questions =
    diagnosticQuestions[currentProblem.category] ||
    diagnosticQuestions.other

  const currentQuestion = questions[currentQuestionIndex]

  const progress =
    ((currentQuestionIndex + 1) / questions.length) * 100

  // Check whether the saved report is within 24 hours
  const getReportAge = () => {
    if (!systemReport || !systemReportCreatedAt) {
      return null
    }

    const scanDate = new Date(systemReportCreatedAt)

    if (Number.isNaN(scanDate.getTime())) {
      return null
    }

    const age =
      (Date.now() - scanDate.getTime()) / (1000 * 60 * 60)

    return age >= 0 ? age : null
  }

  const reportAgeHours = getReportAge()

  const hasFreshReport =
    reportAgeHours !== null &&
    reportAgeHours <= REPORT_VALIDITY_HOURS

  // Select an answer
  const handleAnswerSelect = (answer) => {
    setAnswers((previousAnswers) => ({
      ...previousAnswers,
      [currentQuestion.id]: answer,
    }))
  }

  // Finish diagnostic questions and show system report options
  const handleNext = () => {
    if (!answers[currentQuestion.id]) {
      alert('Please select an answer before proceeding')
      return
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      setCurrentProblem({
        ...currentProblem,
        diagnosticAnswers: answers,
        useSystemReport: false,
        systemReportForDiagnosis: null,
      })

      setShowSystemOptions(true)
      setError('')
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleReset = () => {
    if (window.confirm('Reset all answers? This cannot be undone.')) {
      setCurrentQuestionIndex(0)
      setAnswers({})
      setShowSystemOptions(false)
      setError('')
    }
  }

  // Continue using the saved report
  const handleUsePreviousReport = () => {
    if (!systemReport || !hasFreshReport) {
      setError(
        'A fresh previous report is not available. Please run a new scan or continue without system data.'
      )
      return
    }

    setCurrentProblem({
      ...currentProblem,
      diagnosticAnswers: answers,
      useSystemReport: true,
      systemReportForDiagnosis: systemReport,
      systemReportTimestamp: systemReportCreatedAt,
    })

    navigate('/solution')
  }

  // Continue without system diagnostic data
  const handleContinueWithoutScan = () => {
    setCurrentProblem({
      ...currentProblem,
      diagnosticAnswers: answers,
      useSystemReport: false,
      systemReportForDiagnosis: null,
      systemReportTimestamp: null,
    })

    navigate('/solution')
  }

  // Ask permission, scan the system and save the new report
  const handleRunNewScan = async () => {
    setError('')

    const permission = window.confirm(
      'FixMate wants to collect your current CPU usage, RAM usage and disk usage from your computer. This is a read-only scan. No files will be changed or deleted. Do you allow this system scan?'
    )

    if (!permission) {
      handleContinueWithoutScan()
      return
    }

    setLoading(true)

    try {
      // Use the signed-in FixMate user's JWT to authenticate with the local Agent.
      const jwt = localStorage.getItem('fixmateToken')

      if (!jwt) {
        throw new Error(
          'Your FixMate session has expired. Please log in again before running a system scan.'
        )
      }

      // Collect current system measurements
      let response
      try {
        response = await fetch(
          'http://127.0.0.1:8765/api/diagnostics/system',
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${jwt}`,
              Accept: 'application/json',
            },
          }
        )
      } catch {
        throw new Error(
          'Unable to connect to the FixMate Local Agent. Please make sure it is running.'
        )
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail || 'Unable to collect system diagnostic data.'
        )
      }

      if (!data.report) {
        throw new Error(
          'The system diagnostic report was not received.'
        )
      }

      // Save the new report to Spring Boot / MySQL
      const saveResponse = await apiFetch('/diagnostics', {
        method: 'POST',
        body: JSON.stringify({
          reportJson: JSON.stringify(data.report),
        }),
      })

      if (!saveResponse.ok) {
        let saveError = 'Unable to save the diagnostic report.'

        try {
          const errorData = await saveResponse.json()
          saveError = errorData.message || saveError
        } catch {
          // Use the default message
        }

        throw new Error(saveError)
      }

      const savedDiagnostic = await saveResponse.json()

      const savedTimestamp =
        savedDiagnostic.createdAt || new Date().toISOString()

      // Update shared application state
      setSystemReport(data.report)
      setSystemReportCreatedAt(savedTimestamp)

      sessionStorage.setItem(
        'fixmateSystemReport',
        JSON.stringify(data.report)
      )

      // Continue to solution with the newly scanned report
      setCurrentProblem({
        ...currentProblem,
        diagnosticAnswers: answers,
        useSystemReport: true,
        systemReportForDiagnosis: data.report,
        systemReportTimestamp: savedTimestamp,
      })

      navigate('/solution')

    } catch (err) {
      console.error('Automatic system diagnostic error:', err)

      setError(
        err.message || 'Unable to complete the system diagnostic scan.'
      )
    } finally {
      setLoading(false)
    }
  }

  // Category display name
  const getCategoryName = () => {
    const categoryMap = {
      'slow-computer': 'Slow Computer',
      'network-problem': 'Network Problem',
      'printer-problem': 'Printer Problem',
      'app-crash': 'Application Crash',
      'startup-problem': 'Startup Problem',
      'security-warning': 'Security/Warning',
      'hardware-problem': 'Hardware Problem',
      other: 'Other Problem',
    }

    return categoryMap[currentProblem.category] ||
      currentProblem.category
  }

  // System report decision screen
  if (showSystemOptions) {
    return (
      <div className="diagnostic-questions">
        <div className="container">
          <div className="diagnostic-card card">

            <div className="diagnostic-header">
              <button
                className="back-btn"
                onClick={() => setShowSystemOptions(false)}
                disabled={loading}
              >
                <FiArrowLeft /> Back to Questions
              </button>

              <div className="diagnostic-title">
                <h1>System Diagnostic Check</h1>
                <p className="category-badge">
                  {getCategoryName()}
                </p>
              </div>

              <p>
                Your diagnostic answers are ready. FixMate can also use
                local system measurements to improve the diagnosis.
              </p>
            </div>

            {hasFreshReport ? (
              <div className="system-info-card">
                <FiCheckCircle size={30} />

                <h2>Previous System Report Available</h2>

                <p>
                  Your saved system report is within the last 24 hours.
                </p>

                <p>
                  <strong>Last scan:</strong>{' '}
                  {new Date(systemReportCreatedAt).toLocaleString()}
                </p>

                <p>
                  <strong>Report age:</strong>{' '}
                  {reportAgeHours.toFixed(1)} hours
                </p>

                <div className="diagnostics-success">
                  <FiCheckCircle />
                  Fresh report available for diagnosis.
                </div>

                <div className="navigation-buttons">
                  <button
                    className="btn-primary"
                    onClick={handleUsePreviousReport}
                    disabled={loading}
                  >
                    <FiDatabase /> Use Previous Report
                  </button>

                  <button
                    className="btn-secondary"
                    onClick={handleRunNewScan}
                    disabled={loading}
                  >
                    <FiRefreshCw />
                    {loading ? 'Scanning...' : 'Run New Scan'}
                  </button>

                  <button
                    className="btn-outline"
                    onClick={handleContinueWithoutScan}
                    disabled={loading}
                  >
                    Continue Without System Scan
                  </button>
                </div>
              </div>
            ) : (
              <div className="system-info-card">
                <FiShield size={34} />

                <h2>
                  {systemReport
                    ? 'Previous Report Is Outdated'
                    : 'No Previous System Report Found'}
                </h2>

                {systemReport && systemReportCreatedAt && (
                  <p>
                    <strong>Last scan:</strong>{' '}
                    {new Date(systemReportCreatedAt).toLocaleString()}
                  </p>
                )}

                <p>
                  {systemReport
                    ? 'Your previous report is older than 24 hours. A fresh scan is recommended.'
                    : 'FixMate can collect current CPU, RAM and disk measurements from your computer.'}
                </p>

                <div className="recommendation">
                  <strong>What will be collected?</strong>
                  <p>CPU usage, RAM usage and disk usage.</p>
                  <p>
                    This is a read-only scan. FixMate will not modify,
                    delete or repair your files.
                  </p>
                </div>

                <div className="navigation-buttons">
                  <button
                    className="btn-primary"
                    onClick={handleRunNewScan}
                    disabled={loading}
                  >
                    <FiRefreshCw />
                    {loading ? 'Scanning...' : 'Allow and Run Scan'}
                  </button>

                  <button
                    className="btn-outline"
                    onClick={handleContinueWithoutScan}
                    disabled={loading}
                  >
                    Continue Without Scan
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="alert alert-error">
                {error}

                <p>
                  You can continue using your diagnostic answers without
                  system measurements.
                </p>

                <button
                  className="btn-outline"
                  onClick={handleContinueWithoutScan}
                  disabled={loading}
                >
                  Continue Without Scan
                </button>
              </div>
            )}

            {loading && (
              <div className="diagnostics-empty">
                <FiRefreshCw size={30} />
                <h2>Scanning Your System...</h2>
                <p>
                  Please wait while FixMate collects CPU, RAM and disk
                  measurements and saves the report.
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    )
  }

  // Original diagnostic questions screen
  return (
    <div className="diagnostic-questions">
      <div className="container">
        <div className="diagnostic-card card">

          <div className="diagnostic-header">
            <button
              className="back-btn"
              onClick={() => navigate('/report-problem')}
            >
              <FiArrowLeft /> Back
            </button>

            <div className="diagnostic-title">
              <h1>Diagnostic Questions</h1>
              <p className="category-badge">
                {getCategoryName()}
              </p>
            </div>

            <p>
              Answering these questions helps us diagnose your problem accurately
            </p>
          </div>

          {/* Progress Bar */}
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <p className="progress-text">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>

          {/* Question */}
          <div className="question-container">
            <h2>{currentQuestion.question}</h2>

            <div className="options-grid">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  className={`option-button ${
                    answers[currentQuestion.id] === option
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() => handleAnswerSelect(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="navigation-buttons">
            <button
              className="btn-outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              title="Go to previous question"
            >
              <FiArrowLeft /> Previous
            </button>

            <button
              className="btn-secondary"
              onClick={handleReset}
            >
              <FiRotateCcw /> Reset All
            </button>

            <button
              className="btn-primary"
              onClick={handleNext}
              title={
                currentQuestionIndex === questions.length - 1
                  ? 'Complete diagnosis and get solution'
                  : 'Go to next question'
              }
            >
              {currentQuestionIndex === questions.length - 1
                ? 'Continue to System Check'
                : 'Next'}{' '}
              <FiArrowRight />
            </button>
          </div>

          {/* Answered Questions Indicator */}
          <div className="answered-indicator">
            Answered: {Object.keys(answers).length} / {questions.length}
          </div>

        </div>
      </div>
    </div>
  )
}

export default DiagnosticQuestions
