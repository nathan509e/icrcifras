export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications')
    return 'denied'
  }

  const permission = await Notification.requestPermission()
  return permission
}

export async function subscribeToPush(publicKey) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push messaging not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    })
    return subscription
  } catch (error) {
    console.error('Failed to subscribe to push:', error)
    return null
  }
}

export function unsubscribeFromPush() {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    navigator.serviceWorker.ready.then(registration => {
      registration.pushManager.getSubscription().then(subscription => {
        if (subscription) {
          subscription.unsubscribe()
        }
      })
    })
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function sendSubscriptionToServer(subscription) {
  try {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscription)
    })
    return response.ok
  } catch (error) {
    console.error('Failed to send subscription to server:', error)
    return false
  }
}