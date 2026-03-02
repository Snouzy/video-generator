import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import ProjectList from "./pages/ProjectList";
import ProjectCreate from "./pages/ProjectCreate";
import ProjectView from "./pages/ProjectView";

function App() {
  return (
    <BrowserRouter>
      <Toaster theme="dark" position="top-right" richColors />
      <Routes>
        <Route path="/" element={<ProjectList />} />
        <Route path="/projects/new" element={<ProjectCreate />} />
        <Route path="/projects/:id" element={<ProjectView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
