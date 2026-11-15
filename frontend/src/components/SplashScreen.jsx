
import { useEffect } from 'react'
import './SplashScreen.css'

function SplashScreen({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish()
    }, 2500)

    return () => clearTimeout(timer)
  }, [onFinish])

  return (
    <div className="splash-screen">
      <div className="splash-logo">
        <div className="splash-icon">🔧</div>
      </div>

      <h1 className="splash-title">FixMate</h1>

      <p className="splash-subtitle">
        Smart Computer Troubleshooting
      </p>

      <div className="splash-loader">
        <span />
        <span />
        <span />
      </div>

      <p className="splash-loading">Getting things ready...</p>
    </div>
  )
}

export default SplashScreen
