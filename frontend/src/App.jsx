import { AnimatePresence, motion } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import AnalyticsPage from "./pages/AnalyticsPage";
import ChatPage from "./pages/ChatPage";
import CropsPage from "./pages/CropsPage";
import DashboardPage from "./pages/DashboardPage";
import FieldsPage from "./pages/FieldsPage";
import LoginPage from "./pages/LoginPage";

const pageVariants = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 }
};

function AnimatedRoute({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-night-grid text-slate-100 font-body">
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <AnimatedRoute>
                <LoginPage />
              </AnimatedRoute>
            }
          />
          <Route path="/*" element={<AppShell />}>
            <Route
              path="dashboard"
              element={
                <AnimatedRoute>
                  <DashboardPage />
                </AnimatedRoute>
              }
            />
            <Route
              path="fields"
              element={
                <AnimatedRoute>
                  <FieldsPage />
                </AnimatedRoute>
              }
            />
            <Route
              path="crops"
              element={
                <AnimatedRoute>
                  <CropsPage />
                </AnimatedRoute>
              }
            />
            <Route
              path="chat"
              element={
                <AnimatedRoute>
                  <ChatPage />
                </AnimatedRoute>
              }
            />
            <Route
              path="analytics"
              element={
                <AnimatedRoute>
                  <AnalyticsPage />
                </AnimatedRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}
