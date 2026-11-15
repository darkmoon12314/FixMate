import React from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiCheckCircle, FiTrendingDown, FiZap } from 'react-icons/fi'
import ProblemCategoryCard from '../components/ProblemCategoryCard'
import './Home.css'

function Home() {
  const categories = [
    {
      id: 'slow-computer',
      icon: '🐌',
      title: 'Slow Computer',
      description: 'System running slowly, taking time to respond',
    },
    {
      id: 'network-problem',
      icon: '🌐',
      title: 'Network Problem',
      description: 'WiFi not connecting, internet not working',
    },
    {
      id: 'printer-problem',
      icon: '🖨️',
      title: 'Printer Problem',
      description: 'Printer not responding, printing issues',
    },
    {
      id: 'app-crash',
      icon: '💥',
      title: 'Application Crash',
      description: 'App freezing, crashing, or showing errors',
    },
    {
      id: 'startup-problem',
      icon: '⚡',
      title: 'Startup Problem',
      description: 'Computer not starting, stuck on boot screen',
    },
    {
      id: 'security-warning',
      icon: '🔒',
      title: 'Security/Warning',
      description: 'Suspicious popups, security alerts',
    },
    {
      id: 'hardware-problem',
      icon: '🖥️',
      title: 'Hardware Problem',
      description: 'Device not recognized, hardware failure',
    },
    {
      id: 'other',
      icon: '❓',
      title: 'Other',
      description: 'Problem not listed above',
    },
  ]

  const steps = [
    { number: 1, title: 'Report Problem', icon: '📝' },
    { number: 2, title: 'Diagnose', icon: '🔍' },
    { number: 3, title: 'Find Cause', icon: '🎯' },
    { number: 4, title: 'Get Solution', icon: '💡' },
    { number: 5, title: 'Confirm Fix', icon: '✓' },
  ]

  const features = [
    {
      icon: <FiZap size={32} />,
      title: 'Fast Diagnosis',
      description: 'Get quick answers in minutes',
    },
    {
      icon: <FiCheckCircle size={32} />,
      title: 'Accurate Solutions',
      description: 'Proven troubleshooting steps',
    },
    {
      icon: <FiTrendingDown size={32} />,
      title: 'Learn & Prevent',
      description: 'Understand what went wrong',
    },
  ]

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1>Fix Your Computer Problems Instantly</h1>
              <p>
                FixMate is an intelligent troubleshooting system that diagnoses and resolves
                your computer issues with step-by-step guidance.
              </p>
              <div className="hero-buttons">
                <Link to="/report-problem" className="btn-primary">
                  Report a Problem <FiArrowRight size={18} />
                </Link>
                <Link to="/report-problem" className="btn-secondary">
                  Start Diagnosis
                </Link>
              </div>
            </div>
            <div className="hero-image">
              <div className="hero-icon">🔧</div>
              <div className="hero-decoration"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="categories-section">
        <div className="container">
          <div className="section-title">Common Problem Categories</div>
          <p className="section-subtitle">
            Select your issue type and we'll help you resolve it
          </p>
          <div className="grid grid-3">
            {categories.map((category) => (
              <ProblemCategoryCard key={category.id} {...category} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <div className="container">
          <div className="section-title">How FixMate Works</div>
          <div className="steps-container">
            {steps.map((step, index) => (
              <div key={step.number} className="step">
                <div className="step-icon">{step.icon}</div>
                <div className="step-title">{step.title}</div>
                {index < steps.length - 1 && <div className="step-arrow">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-title">Why Choose FixMate?</div>
          <div className="grid grid-3">
            {features.map((feature, index) => (
              <div key={index} className="feature-card card">
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container cta-content">
          <h2>Ready to Fix Your Computer?</h2>
          <p>Start your diagnosis right now and get solutions fast.</p>
          <Link to="/report-problem" className="btn-primary">
            Get Started
          </Link>
        </div>
      </section>
    </div>
  )
}

export default Home