import { useLocation } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { cn } from "@/lib/utils"

// A running workout keeps its controls in a bar along the bottom edge, where
// toasts normally appear. A toast there (the previous workout's "Undo" when
// the next same-day workout opens) takes the tap meant for "I'm ready", so
// on the workout screen toasts drop in from the top instead.
const isWorkoutScreen = (pathname: string) =>
  /^\/workouts?\/[^/]+\/(session|start|try)$/.test(pathname)
  || /^\/exercises\/[^/]+\/try$/.test(pathname)

export function Toaster() {
  const { toasts } = useToast()
  const onTop = isWorkoutScreen(useLocation().pathname)

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} className={onTop ? cn("data-[state=open]:slide-in-from-top-full", props.className) : props.className}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport className={onTop ? "bottom-auto top-0 pb-4 pt-[max(1rem,var(--app-safe-area-top))]" : undefined} />
    </ToastProvider>
  )
}
