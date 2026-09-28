import { ExMessage, ExMessageContext, ThemeProvider } from "@exre/exui"
import "@exre/exui/style.css"

export default function ManagedNotifications() {
  const save = async () => {
    const pending = ExMessage.loading("Saving changes")
    try {
      await Promise.resolve()
      pending.onSuccess("Changes saved")
    } catch {
      pending.onError("Could not save changes")
    }
  }

  return (
    <ThemeProvider>
      <ExMessageContext duration={3000} placement="top-right" maxCount={3} />
      <button onClick={() => ExMessage.info("Ready")}>Info</button>
      <button onClick={save}>Save</button>
    </ThemeProvider>
  )
}
