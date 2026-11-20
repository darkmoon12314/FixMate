
import { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiMail,
  FiLock,
  FiUser,
  FiArrowRight,
  FiEye,
  FiEyeOff,
} from 'react-icons/fi'
import { AppContext } from '../App'
import './LoginRegister.css'

const API_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/users`;

function LoginRegister() {
  const navigate = useNavigate()
  const { setUser } = useContext(AppContext)

  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: '' }))
    setServerError('')
  }

  const validateLogin = () => {
    const newErrors = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    return newErrors
  }

  const validateRegister = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    }

    if (
      !formData.password ||
      formData.password.length < 8 ||
      formData.password.length > 72
    ) {
      newErrors.password = 'Password must be 8 to 72 characters'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    return newErrors
  }

  const handleLogin = async (e) => {
    e.preventDefault()

    const newErrors = validateLogin()
    if (Object.keys(newErrors).length) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    setServerError('')

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      })

      
      const data = await response.json()

      if (!response.ok) {
        setServerError(data.message || 'Login failed')
        return
      }

      if (!data.token) {
        setServerError(
          'Login succeeded, but no token was returned. Check the backend login API.'
        )
        return
      }

      // Save the JWT token for authenticated API requests.
      localStorage.setItem('fixmateToken', data.token)

      setUser({
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
      })

      navigate('/')
    } catch {
      setServerError(
        'Cannot connect to FixMate server. Make sure the backend is running.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()

    const newErrors = validateRegister()
    if (Object.keys(newErrors).length) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    setServerError('')

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setServerError(data.message || 'Registration failed')
        return
      }

      setFormData({
        email: formData.email.trim(),
        password: '',
        name: '',
        confirmPassword: '',
      })

      setShowPassword(false)
      setShowConfirmPassword(false)
      setMode('login')
      setErrors({})
      setServerError('Account created successfully. Please log in.')
    } catch {
      setServerError(
        'Cannot connect to FixMate server. Make sure the backend is running.'
      )
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode((previous) => previous === 'login' ? 'register' : 'login')
    setErrors({})
    setServerError('')
    setShowPassword(false)
    setShowConfirmPassword(false)
    setFormData({
      email: '',
      password: '',
      name: '',
      confirmPassword: '',
    })
  }

  return (
    <div className="login-register">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">🔧</div>
            <h1>FixMate</h1>
            <p>
              {mode === 'login'
                ? 'Welcome to Fixmate'
                : 'Create Your Account'}
            </p>
          </div>

          <form
            onSubmit={mode === 'login' ? handleLogin : handleRegister}
            className="auth-form"
          >
            {mode === 'register' && (
              <div className="form-group">
                <label htmlFor="name"><FiUser /> Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className={errors.name ? 'error' : ''}
                  autoComplete="name"
                  required
                />
                {errors.name && (
                  <span className="error-text">{errors.name}</span>
                )}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email"><FiMail /> Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                className={errors.email ? 'error' : ''}
                autoComplete="email"
                required
              />
              {errors.email && (
                <span className="error-text">{errors.email}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password"><FiLock /> Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={
                    mode === 'login'
                      ? 'Enter your password'
                      : 'Create a password'
                  }
                  className={errors.password ? 'error' : ''}
                  autoComplete={
                    mode === 'login' ? 'current-password' : 'new-password'
                  }
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {errors.password && (
                <span className="error-text">{errors.password}</span>
              )}
            </div>

            {mode === 'register' && (
              <div className="form-group">
                <label htmlFor="confirmPassword">
                  <FiLock /> Confirm Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your password"
                    className={errors.confirmPassword ? 'error' : ''}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowConfirmPassword((previous) => !previous)
                    }
                    aria-label={
                      showConfirmPassword
                        ? 'Hide confirm password'
                        : 'Show confirm password'
                    }
                  >
                    {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <span className="error-text">
                    {errors.confirmPassword}
                  </span>
                )}
              </div>
            )}

            {serverError && (
              <p
                className={
                  serverError.startsWith('Account created')
                    ? 'success-text'
                    : 'error-text'
                }
                role="status"
              >
                {serverError}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary full-width"
              disabled={loading}
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Login'
                  : 'Create Account'}
              {!loading && <FiArrowRight />}
            </button>
          </form>

          <div className="auth-toggle">
            <p>
              {mode === 'login'
                ? "Don't have an account?"
                : 'Already have an account?'}
              <button
                type="button"
                className="toggle-btn"
                onClick={switchMode}
                disabled={loading}
              >
                {mode === 'login' ? 'Register' : 'Login'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginRegister
