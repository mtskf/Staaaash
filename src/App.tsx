import { Dashboard } from "@/features/dashboard/Dashboard"
import { Toaster } from "sonner"

function App() {
  return (
    <>
      <Dashboard />
      <Toaster richColors position="bottom-right" />
    </>
  )
}

export default App
