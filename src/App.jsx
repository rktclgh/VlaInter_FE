import { Routes, Route } from 'react-router-dom'
import { StartingPage } from './pages/StartingPage'
import { Login } from './pages/auth/Login'
import { Join } from './pages/auth/Join'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<StartingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/join" element={<Join />} />
    </Routes>
  )
}

export default App
