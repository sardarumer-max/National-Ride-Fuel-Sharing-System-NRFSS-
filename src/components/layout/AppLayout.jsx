import Navbar from './Navbar'
import Sidebar from './Sidebar'

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />
      <div className="flex">
        <div className="hidden lg:flex">
          <Sidebar />
        </div>
        <main className="flex-1 min-h-[calc(100vh-64px)] overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
