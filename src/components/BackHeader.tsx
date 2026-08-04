import { Link } from 'react-router-dom'

export default function BackHeader({ title, to = '/settings' }: { title: string; to?: string }) {
  return (
    <div className="back-header">
      <Link to={to}>&larr; Kembali</Link>
      <h2 style={{ fontSize: 16, fontWeight: 500 }}>{title}</h2>
    </div>
  )
}
