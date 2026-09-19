import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Shell from "./app/layout/Shell";
import CareerSimulator from "./app/pages/CareerSimulator";
import SkillGap from "./app/pages/SkillGap";
import ResumeUpload from "./app/pages/ResumeUpload";
import RoleCompare from "./app/pages/RoleCompare";
import DataManager from "./app/pages/DataManager";
import CareerAssistant from "./app/pages/CareerAssistant";
import NotFound from "./app/pages/NotFound";
import SplashScreen from "./app/pages/SplashScreen";
import Onboarding from "./app/pages/Onboarding";
import Login from "./app/pages/Login";
import { isOnboarded } from "./core/db/repo";
import { ThemeProvider } from "./core/context/ThemeContext";
import { AuthProvider, useAuth } from "./core/context/AuthContext";

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [onboarded, setOnboarded] = useState(null); // null = loading
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const check = async () => {
      const done = await isOnboarded();
      setOnboarded(done);
    };
    check();
  }, [user]);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // Still checking onboarding and auth status
  if (onboarded === null || authLoading) {
    return (
      <div className="fixed inset-0 bg-[#0b0f19] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#13ec6d]" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Dedicated 3D Animated Login Portal */}
        <Route path="/login" element={<Login />} />

        {/* If not onboarded and not logged in, prompt Login portal */}
        {!onboarded && !user && (
          <Route path="/onboarding" element={<Onboarding onComplete={() => setOnboarded(true)} />} />
        )}

        {/* Main Shell Navigation */}
        <Route path="/" element={<Shell />}>
          <Route 
            index 
            element={
              !onboarded && !user ? (
                <Navigate to="/login" replace />
              ) : (
                <Navigate to="/career" replace />
              )
            } 
          />
          <Route path="career" element={<CareerSimulator />} />
          <Route path="skill-gap" element={<SkillGap />} />
          <Route path="upload" element={<ResumeUpload />} />
          <Route path="compare" element={<RoleCompare />} />
          <Route path="career-assistant" element={<CareerAssistant />} />
          <Route path="assistant" element={<Navigate to="/career-assistant" replace />} />
          <Route path="data" element={<DataManager />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
