import { Routes, Route, Outlet } from 'react-router-dom'
import { StartingPage } from './pages/StartingPage'
import { Login } from './pages/auth/Login'
import { Join } from './pages/auth/Join'
import { ForgotPassword } from './pages/auth/ForgotPassword'
import { KakaoCallback } from './pages/auth/KakaoCallback'
import { TermsPage } from './pages/TermsPage'
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage'
import { ServiceIntroPage } from './pages/ServiceIntroPage'
import { InterviewStartPage } from './pages/content/InterviewStartPage'
import { TechPracticePage } from './pages/content/TechPracticePage'
import { InterviewSessionPage } from './pages/content/InterviewSessionPage'
import { InterviewHistoryPage } from './pages/content/InterviewHistoryPage'
import { PracticeHistoryPage } from './pages/content/PracticeHistoryPage'
import { SavedQuestionsPage } from './pages/content/SavedQuestionsPage'
import { QuestionSetsPage } from './pages/content/QuestionSetsPage'
import { QuestionBrowsePage } from './pages/content/QuestionBrowsePage'
import { AdminConsolePage } from './pages/content/AdminConsolePage'
import { PointChargeCallbackPage } from './pages/content/PointChargeCallbackPage'
import { FileUploadPage } from './pages/content/FileUploadPage'
import { MyPage } from './pages/content/MyPage'
import { ErrorPage } from './pages/ErrorPage'
import { GeminiApiKeyGuard } from './components/GeminiApiKeyGuard'
import { BrowserSessionGuard } from './components/BrowserSessionGuard'
import './App.css'

const GuardedContentRoutes = () => (
  <BrowserSessionGuard>
    <GeminiApiKeyGuard>
      <Outlet />
    </GeminiApiKeyGuard>
  </BrowserSessionGuard>
)

function App() {
  return (
    <Routes>
      <Route path="/" element={<StartingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/join" element={<Join />} />
      <Route path="/password/forgot" element={<ForgotPassword />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/about" element={<ServiceIntroPage />} />
      <Route path="/auth/kakao/callback" element={<KakaoCallback />} />
      <Route element={<GuardedContentRoutes />}>
        <Route path="/content/interview" element={<InterviewStartPage />} />
        <Route path="/content/tech-practice" element={<TechPracticePage />} />
        <Route path="/content/interview-history" element={<InterviewHistoryPage />} />
        <Route path="/content/practice-history" element={<PracticeHistoryPage />} />
        <Route path="/content/interview/session" element={<InterviewSessionPage />} />
        <Route path="/content/saved-questions" element={<SavedQuestionsPage />} />
        <Route path="/content/question-sets" element={<QuestionSetsPage />} />
        <Route path="/content/question-browse" element={<QuestionBrowsePage />} />
        <Route path="/content/files" element={<FileUploadPage />} />
        <Route path="/content/point-charge" element={<MyPage />} />
      </Route>
      <Route path="/content/admin" element={<BrowserSessionGuard><AdminConsolePage /></BrowserSessionGuard>} />
      <Route path="/content/mypage" element={<BrowserSessionGuard><MyPage /></BrowserSessionGuard>} />
      <Route path="/content/point-charge/callback" element={<PointChargeCallbackPage />} />
      <Route path="/errors/403" element={<ErrorPage code={403} />} />
      <Route path="/errors/404" element={<ErrorPage code={404} />} />
      <Route path="*" element={<ErrorPage code={404} />} />
    </Routes>
  )
}

export default App
