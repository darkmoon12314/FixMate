import React from 'react'
import { Link } from 'react-router-dom'

function ProblemCategoryCard({ icon, title, description, id }) {
  return (
    <div className="category-card card">
      <div className="category-icon">{icon}</div>

      <h3>{title}</h3>

      <p>{description}</p>

      <Link
        to={`/report-problem?category=${id}`}
        className="btn-primary btn-small"
      >
        Select →
      </Link>
    </div>
  )
}

export default ProblemCategoryCard