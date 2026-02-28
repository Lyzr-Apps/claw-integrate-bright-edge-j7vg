import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
        <p className="text-muted-foreground text-lg mb-2">Page not found</p>
        <p className="text-muted-foreground text-sm mb-6">The page you are looking for does not exist.</p>
        <Link
          href="/"
          className="px-6 py-3 bg-primary text-primary-foreground rounded-sm font-medium hover:opacity-90 transition-opacity"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
