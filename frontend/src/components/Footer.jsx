import React from 'react'
import { FiGithub, FiTwitter, FiLinkedin, FiMail } from 'react-icons/fi'
import './Footer.css'

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h4>FixMate</h4>
            <p>An intelligent troubleshooting system for computer problems.</p>
          </div>

          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/report-problem">Report Problem</a></li>
              <li><a href="/history">Issue History</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Support</h4>
            <ul>
              <li><a href="#help">FAQ</a></li>
              <li><a href="#contact">Contact Us</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Follow Us</h4>
            <div className="social-links">
              <a href="#" aria-label="GitHub"><FiGithub size={20} /></a>
              <a href="#" aria-label="Twitter"><FiTwitter size={20} /></a>
              <a href="#" aria-label="LinkedIn"><FiLinkedin size={20} /></a>
              <a href="#" aria-label="Email"><FiMail size={20} /></a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2024 FixMate. All rights reserved.</p>
          <p>Built for solving computer problems efficiently.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer