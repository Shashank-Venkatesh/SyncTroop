import { useEffect, useState } from 'react'

const LOW_NETWORK_TYPES = new Set(['slow-2g', '2g'])

function readNetworkStatus() {
  if (typeof window === 'undefined') {
    return {
      isOnline: true,
      effectiveType: 'unknown',
      downlink: null,
      saveData: false,
      isLowNetwork: false,
    }
  }

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null
  const isOnline = typeof navigator.onLine === 'boolean' ? navigator.onLine : true
  const effectiveType = connection?.effectiveType || 'unknown'
  const downlink = typeof connection?.downlink === 'number' ? connection.downlink : null
  const saveData = Boolean(connection?.saveData)

  return {
    isOnline,
    effectiveType,
    downlink,
    saveData,
    isLowNetwork: !isOnline || saveData || LOW_NETWORK_TYPES.has(effectiveType) || (downlink !== null && downlink < 1.2),
  }
}

export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState(() => readNetworkStatus())

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const updateNetworkStatus = () => setNetworkStatus(readNetworkStatus())
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null

    window.addEventListener('online', updateNetworkStatus)
    window.addEventListener('offline', updateNetworkStatus)
    connection?.addEventListener?.('change', updateNetworkStatus)

    updateNetworkStatus()

    return () => {
      window.removeEventListener('online', updateNetworkStatus)
      window.removeEventListener('offline', updateNetworkStatus)
      connection?.removeEventListener?.('change', updateNetworkStatus)
    }
  }, [])

  return networkStatus
}