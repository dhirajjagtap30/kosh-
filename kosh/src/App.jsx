import { Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import Teacher from "./pages/Teacher";
import Student from "./pages/Student";
import ExamFlow from "./pages/ExamFlow";
import Analysis from "./pages/Analysis";
import Reports from "./pages/Reports";
import StudentDashboardPage from "./pages/StudentDashboardPage";
import Contact from "./pages/Contact";
import Features from "./pages/Features";
import HowItWorks from "./pages/HowItWorks";
import Analytics from "./pages/Analytics";
import Faq from "./pages/Faq";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import About from "./pages/About";
import Register from "./pages/Register";
import Enquiries from "./pages/Enquiries";
import { Navigate } from "react-router-dom";
import { RequireRole, useAuth } from "./auth/AuthContext";
import { DASHBOARD_ROLES } from "./auth/users";
import DbStaff from "./dashboard/pages/Staff";
import DashboardLayout from "./dashboard/DashboardLayout";
import Overview from "./dashboard/pages/Overview";
import DbTests from "./dashboard/pages/Tests";
import DbTestDetail from "./dashboard/pages/TestDetail";
import DbStudents from "./dashboard/pages/Students";
import DbStudentDetail from "./dashboard/pages/StudentDetail";
import DbAnalysis from "./dashboard/pages/Analysis";
import DbReports from "./dashboard/pages/Reports";
import DbSettings from "./dashboard/pages/Settings";
import DbRegistrations from "./dashboard/pages/Registrations";
import DbParents from "./dashboard/pages/Parents";
import DbQuestions from "./dashboard/pages/Questions";
import DbPapers from "./dashboard/pages/Papers";
import DbBatches from "./dashboard/pages/Batches";
import DbMaterials from "./dashboard/pages/Materials";
import DbBranches from "./dashboard/pages/Branches";
import DbCourses from "./dashboard/pages/Courses";
import DbMessages from "./dashboard/pages/Messages";
import DbNotices from "./dashboard/pages/Notices";
import TeacherHome from "./dashboard/pages/TeacherHome";
import DbNotify from "./dashboard/pages/Notify";
import DbTeacherReports from "./dashboard/pages/TeacherReports";
import DbAttendance from "./dashboard/pages/Attendance";
import StudentExamPage from "./pages/StudentExamPage";
import DbRegReports from "./dashboard/pages/RegReports";
import ParentDashboardPage from "./pages/ParentDashboardPage";

/* Staff / trainer logins get the Teacher home; admin-only pages send them back to it. */
const isTeacher = (u) => Boolean(u && (u.role === "staff" || u.role === "trainer"));
function DashHome() { const { user } = useAuth(); return isTeacher(user) ? <TeacherHome /> : <Overview />; }
function AdminOnly({ children }) { const { user } = useAuth(); return isTeacher(user) ? <Navigate to="/dashboard" replace /> : children; }

export default function App() {
  return (
    <Routes>
      <Route path="dashboard" element={<RequireRole role={DASHBOARD_ROLES}><DashboardLayout /></RequireRole>}>
        <Route index element={<DashHome />} />
        <Route path="tests" element={<DbTests />} />
        <Route path="tests/:id" element={<DbTestDetail />} />
        <Route path="students" element={<DbStudents />} />
        <Route path="students/:id" element={<DbStudentDetail />} />
        <Route path="analysis" element={<DbAnalysis />} />
        <Route path="reports" element={<DbReports />} />
        <Route path="registrations" element={<AdminOnly><DbRegistrations /></AdminOnly>} />
        <Route path="parents" element={<AdminOnly><DbParents /></AdminOnly>} />
        <Route path="questions" element={<DbQuestions />} />
        <Route path="papers" element={<DbPapers />} />
        <Route path="batches" element={<DbBatches />} />
        <Route path="materials" element={<DbMaterials />} />
        <Route path="courses" element={<DbCourses />} />
        <Route path="attendance" element={<DbAttendance />} />
        <Route path="messages" element={<DbMessages />} />
        <Route path="notices" element={<DbNotices />} />
        <Route path="notify" element={<DbNotify />} />
        <Route path="teacher-reports" element={<DbTeacherReports />} />
        <Route path="branches" element={<AdminOnly><DbBranches /></AdminOnly>} />
        <Route path="reg-reports" element={<AdminOnly><DbRegReports /></AdminOnly>} />
        <Route path="staff" element={<AdminOnly><DbStaff /></AdminOnly>} />
        <Route path="settings" element={<AdminOnly><DbSettings /></AdminOnly>} />
        <Route path="*" element={<Overview />} />
      </Route>
      <Route path="student-dashboard" element={<RequireRole role="student"><StudentDashboardPage /></RequireRole>} />
      <Route path="student-exam/:id" element={<RequireRole role="student"><StudentExamPage /></RequireRole>} />
      <Route path="parent-dashboard" element={<RequireRole role="parent"><ParentDashboardPage /></RequireRole>} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="features" element={<Features />} />
        <Route path="how-it-works" element={<HowItWorks />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="faq" element={<Faq />} />
        <Route path="admin" element={<Admin />} />
        <Route path="teacher" element={<Teacher />} />
        <Route path="student" element={<Student />} />
        <Route path="exam-flow" element={<ExamFlow />} />
        <Route path="analysis" element={<Analysis />} />
        <Route path="reports" element={<Reports />} />
        <Route path="contact" element={<Contact />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="enquiries" element={<Enquiries />} />
        <Route path="admin-login" element={<Login portal="admin" />} />
        <Route path="student-login" element={<Login portal="student" />} />
        <Route path="parent-login" element={<Login portal="parent" />} />
        <Route path="staff-login" element={<Login portal="staff" />} />
        <Route path="trainer-login" element={<Navigate to="/staff-login" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
