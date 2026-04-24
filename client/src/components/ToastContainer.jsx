import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'
import { useNotification } from '../contexts/NotificationContext'

function Toast({ notification, onRemove }) {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-emerald-400" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-rose-400" />
      default:
        return <Info className="h-5 w-5 text-blue-400" />
    }
  }

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-emerald-500/15 border-emerald-500/30'
      case 'error':
        return 'bg-rose-500/15 border-rose-500/30'
      default:
        return 'bg-blue-500/15 border-blue-500/30'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, x: 100 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: -10, x: 100 }}
      className={`flex max-w-sm items-start gap-3 rounded-lg border p-3 ${getBackgroundColor()}`}
    >
      {getIcon()}
      <div className="flex-1">
        <p className="text-sm text-slate-100">{notification.message}</p>
      </div>
      <button
        onClick={() => onRemove(notification.id)}
        className="text-slate-400 hover:text-slate-200"
      >
        <X size={16} />
      </button>
    </motion.div>
  )
}

export function ToastContainer() {
  const { notifications, removeNotification } = useNotification()

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {notifications.map(notification => (
          <Toast key={notification.id} notification={notification} onRemove={removeNotification} />
        ))}
      </AnimatePresence>
    </div>
  )
}
