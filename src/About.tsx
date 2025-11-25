// src/About.tsx
import { Link } from 'react-router-dom'

export function About() {
  return (
    <div style={{ padding: 24 }}>
      <h1>About</h1>
      <p>これは React Router v7 のテストページです。</p>

      <p style={{ marginTop: 16 }}>
        <Link to="/">← Home に戻る</Link>
      </p>
    </div>
  )
}
