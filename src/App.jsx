import { Routes, Route } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import SearchPage from './pages/SearchPage.jsx'
import CompanyPage from './pages/CompanyPage.jsx'
import WatchlistPage from './pages/WatchlistPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'

function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/company/:corpCode" element={<CompanyPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </>
  )
}

export default App
