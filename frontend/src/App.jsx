
import { useState, createContext, useEffect } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom'

import Navbar from './components/Navbar'
import Footer from './components/Footer'
import SplashScreen from './components/SplashScreen'

import Home from './pages/Home'
import ProblemReporting from './pages/ProblemReporting'
import DiagnosticQuestions from './pages/DiagnosticQuestions'
import SolutionPage from './pages/SolutionPage'
import IssueHistory from './pages/IssueHistory'
import LoginRegister from './pages/LoginRegister'
import AdminDashboard from './pages/AdminDashboard'
import SystemDiagnostics from './pages/SystemDiagnostics'

import TempCleanup from './repair/TempCleanup'
import NetworkTroubleshooting from './repair/NetworkTroubleshooting'

import { apiFetch } from './api'

import './App.css'

export const AppContext = createContext()

// Restore a session only when BOTH user data and JWT exist.
function getInitialUser() {
  try {
    const token = localStorage.getItem('fixmateToken')
    const savedUser = localStorage.getItem('fixmateUser')

    if (!token || !savedUser) {
      localStorage.removeItem('fixmateToken')
      localStorage.removeItem('fixmateUser')
      return null
    }

    const parsedUser = JSON.parse(savedUser)

    if (
      !parsedUser ||
      typeof parsedUser !== 'object' ||
      !parsedUser.id ||
      !parsedUser.email
    ) {
      localStorage.removeItem('fixmateToken')
      localStorage.removeItem('fixmateUser')
      return null
    }

    return parsedUser
  } catch {
    localStorage.removeItem('fixmateToken')
    localStorage.removeItem('fixmateUser')
    return null
  }
}

function ProtectedLayout({ user }) {
  const location = useLocation()

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    )
  }

  return (
    <div className="app">
      <Navbar />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />

          <Route
            path="/report-problem"
            element={<ProblemReporting />}
          />

          <Route
            path="/diagnostic"
            element={<DiagnosticQuestions />}
          />

          <Route
            path="/solution"
            element={<SolutionPage />}
          />

          <Route
            path="/history"
            element={<IssueHistory />}
          />

          <Route
            path="/admin"
            element={<AdminDashboard />}
          />

          <Route
            path="/system-diagnostics"
            element={<SystemDiagnostics />}
          />

          <Route
            path="/temp-cleanup"
            element={<TempCleanup />}
          />

          <Route
            path="/network-troubleshooting"
            element={<NetworkTroubleshooting />}
          />

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </main>

      <Footer />
    </div>
  )
}

function App() {
  const [user, setUser] = useState(getInitialUser)

  const [currentProblem, setCurrentProblem] = useState(null)

  const [systemReport, setSystemReport] = useState(null)

  const [systemReportCreatedAt, setSystemReportCreatedAt] =
    useState(null)

  const [issueHistory, setIssueHistory] = useState([
    {
      id: 1,
      category: 'Slow Computer',
      description: 'My computer is running very slowly',
      date: '2024-01-15',
      diagnosis: 'High CPU usage - Chrome has 15 tabs open',
      solution: 'Close unnecessary tabs and restart browser',
      status: 'Resolved',
    },
    {
      id: 2,
      category: 'Network Problem',
      description: 'WiFi not connecting',
      date: '2024-01-10',
      diagnosis: 'Router offline',
      solution: 'Restart router',
      status: 'Resolved',
    },
  ])

  const [showSplash, setShowSplash] = useState(true)

  // Keep user information and JWT session consistent.
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('fixmateToken')

      if (token) {
        localStorage.setItem(
          'fixmateUser',
          JSON.stringify(user)
        )
      } else {
        localStorage.removeItem('fixmateUser')
        setUser(null)
      }
    } else {
      localStorage.removeItem('fixmateUser')
      localStorage.removeItem('fixmateToken')

      setSystemReport(null)
      setSystemReportCreatedAt(null)

      sessionStorage.removeItem('fixmateSystemReport')
    }
  }, [user])

  // Automatically end the app session when the backend rejects
  // an expired or invalid JWT with HTTP 401.
  useEffect(() => {
    const handleAuthenticationExpired = () => {
      localStorage.removeItem('fixmateToken')
      localStorage.removeItem('fixmateUser')
      setUser(null)
    }

    window.addEventListener(
      'fixmate:auth-expired',
      handleAuthenticationExpired
    )

    return () => {
      window.removeEventListener(
        'fixmate:auth-expired',
        handleAuthenticationExpired
      )
    }
  }, [])

  // Load the latest saved diagnostic report for the logged-in user.
  useEffect(() => {
    let cancelled = false

    const loadLatestDiagnostic = async () => {
      if (!user) {
        setSystemReport(null)
        setSystemReportCreatedAt(null)

        sessionStorage.removeItem('fixmateSystemReport')
        return
      }

      // Do not make authenticated requests without a JWT.
      const token = localStorage.getItem('fixmateToken')

      if (!token) {
        setUser(null)
        return
      }

      try {
        const response = await apiFetch('/diagnostics/latest')

        if (response.status === 204) {
          if (!cancelled) {
            setSystemReport(null)
            setSystemReportCreatedAt(null)

            sessionStorage.removeItem('fixmateSystemReport')
          }

          return
        }

        if (!response.ok) {
          throw new Error(
            `Unable to retrieve diagnostic report. HTTP ${response.status}`
          )
        }

        const savedDiagnostic = await response.json()

        if (!savedDiagnostic.reportJson) {
          throw new Error('Saved diagnostic report is empty.')
        }

        const report = JSON.parse(savedDiagnostic.reportJson)

        if (!cancelled) {
          setSystemReport(report)
          setSystemReportCreatedAt(savedDiagnostic.createdAt)

          sessionStorage.setItem(
            'fixmateSystemReport',
            JSON.stringify(report)
          )
        }
      } catch (error) {
        console.error(
          'Unable to load previous diagnostic:',
          error
        )
      }
    }

    loadLatestDiagnostic()

    return () => {
      cancelled = true
    }
  }, [user])

  const finishSplash = () => {
    setShowSplash(false)
  }

  const contextValue = {
    user,
    setUser,

    currentProblem,
    setCurrentProblem,

    systemReport,
    setSystemReport,

    systemReportCreatedAt,
    setSystemReportCreatedAt,

    issueHistory,
    setIssueHistory,
  }

  return (
    <AppContext.Provider value={contextValue}>
      <Router>
        {showSplash ? (
          <SplashScreen onFinish={finishSplash} />
        ) : (
          <Routes>
            <Route
              path="/login"
              element={
                user ? (
                  <Navigate to="/" replace />
                ) : (
                  <LoginRegister />
                )
              }
            />

            <Route
              path="*"
              element={<ProtectedLayout user={user} />}
            />
          </Routes>
        )}
      </Router>
    </AppContext.Provider>
  )
}

export default App
