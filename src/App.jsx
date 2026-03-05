import { Routes, Route } from 'react-router-dom'
import { StartingPage } from './pages/StartingPage'
import { Login } from './pages/auth/Login'
import { Join } from './pages/auth/Join'
import { KakaoCallback } from './pages/auth/KakaoCallback'
import { InterviewStartPage } from './pages/content/InterviewStartPage'
import { PointChargePage } from './pages/content/PointChargePage'
import { FileUploadPage } from './pages/content/FileUploadPage'
import { MyPage } from './pages/content/MyPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<StartingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/join" element={<Join />} />
      <Route path="/auth/kakao/callback" element={<KakaoCallback />} />
      <Route path="/content/interview" element={<InterviewStartPage />} />
      <Route path="/content/files" element={<FileUploadPage />} />
      <Route path="/content/mypage" element={<MyPage />} />
      <Route path="/content/point-charge" element={<PointChargePage />} />
    </Routes>
  )
}

export default App
