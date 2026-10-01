import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="not-found page-enter">
      <h1>404</h1>
      <p style={{ margin: '8px 0 20px', color: 'var(--gray-500)' }}>That page doesn't exist.</p>
      <Link className="btn btn-primary" to="/">
        Back to dashboard
      </Link>
    </div>
  );
}
