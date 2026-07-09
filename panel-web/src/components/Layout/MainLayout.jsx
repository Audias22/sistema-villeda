import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import './MainLayout.css'

function MainLayout({ children }) {
  const location = useLocation()

  return (
    <div className="main-layout">
      <Sidebar />
      <div className="main-content">
        <TopBar />
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            className="main-page"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  )
}

export default MainLayout
