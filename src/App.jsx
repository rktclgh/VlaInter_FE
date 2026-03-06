import { Routes, Route } from 'react-router-dom'
import { StartingPage } from './pages/StartingPage'
import { Login } from './pages/auth/Login'
import { Join } from './pages/auth/Join'
import { ForgotPassword } from './pages/auth/ForgotPassword'
import { KakaoCallback } from './pages/auth/KakaoCallback'
import { InterviewStartPage } from './pages/content/InterviewStartPage'
import { InterviewSessionPage } from './pages/content/InterviewSessionPage'
import { SavedQuestionsPage } from './pages/content/SavedQuestionsPage'
import { QuestionSetsPage } from './pages/content/QuestionSetsPage'
import { PointChargeCallbackPage } from './pages/content/PointChargeCallbackPage'
import { FileUploadPage } from './pages/content/FileUploadPage'
import { MyPage } from './pages/content/MyPage'
import { ErrorPage } from './pages/ErrorPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<StartingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/join" element={<Join />} />
      <Route path="/password/forgot" element={<ForgotPassword />} />
      <Route path="/auth/kakao/callback" element={<KakaoCallback />} />
      <Route path="/content/interview" element={<InterviewStartPage />} />
      <Route path="/content/interview/session" element={<InterviewSessionPage />} />
      <Route path="/content/saved-questions" element={<SavedQuestionsPage />} />
      <Route path="/content/question-sets" element={<QuestionSetsPage />} />
      <Route path="/content/files" element={<FileUploadPage />} />
      <Route path="/content/mypage" element={<MyPage />} />
      <Route path="/content/point-charge" element={<MyPage />} />
      <Route path="/content/point-charge/callback" element={<PointChargeCallbackPage />} />
      <Route path="/errors/403" element={<ErrorPage code={403} />} />
      <Route path="/errors/404" element={<ErrorPage code={404} />} />
      <Route path="*" element={<ErrorPage code={404} />} />
    </Routes>
  )
}

export default App
