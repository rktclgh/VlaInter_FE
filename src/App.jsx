import { Routes, Route } from 'react-router-dom'
import { StartingPage } from './pages/StartingPage'
import { Login } from './pages/auth/Login'
import { Join } from './pages/auth/Join'
import { KakaoCallback } from './pages/auth/KakaoCallback'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<StartingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/join" element={<Join />} />
      <Route path="/auth/kakao/callback" element={<KakaoCallback />} />
    </Routes>
  )
}

export default App
