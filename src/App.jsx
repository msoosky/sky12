import { Routes, Route } from 'react-router-dom'
import SearchPage from './pages/SearchPage.jsx'
import CompanyPage from './pages/CompanyPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<SearchPage />} />
      <Route path="/company/:corpCode" element={<CompanyPage />} />
    </Routes>
  )
}

export default App
