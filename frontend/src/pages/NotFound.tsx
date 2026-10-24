import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="text-7xl font-black text-brand-500">404</div>
      <h1 className="mt-2 text-2xl font-black">Looks like you took a wrong turn</h1>
      <p className="mt-2 text-gray-500">The page you are looking for does not exist.</p>
      <Link to="/" className="mt-6 inline-block font-bold text-brand-600">
        Back to home
      </Link>
    </div>
  )
}
