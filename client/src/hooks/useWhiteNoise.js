import { useEffect, useRef } from 'react'

export function useWhiteNoise(enabled, gainLevel = 0.02) {
  const contextRef = useRef(null)

  useEffect(() => {
    if (!enabled) {
      const currentContext = contextRef.current

      if (currentContext) {
        currentContext.close().catch(() => {})
        contextRef.current = null
      }

      return undefined
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext

    if (!AudioContextClass) {
      return undefined
    }

    const audioContext = new AudioContextClass()
    const bufferSize = audioContext.sampleRate * 2
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate)
    const output = buffer.getChannelData(0)

    for (let index = 0; index < bufferSize; index += 1) {
      output[index] = Math.random() * 2 - 1
    }

    const source = audioContext.createBufferSource()
    const gainNode = audioContext.createGain()

    source.buffer = buffer
    source.loop = true
    gainNode.gain.value = gainLevel

    source.connect(gainNode)
    gainNode.connect(audioContext.destination)
    source.start()

    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {})
    }

    contextRef.current = audioContext

    return () => {
      try {
        source.stop()
      } catch {
        // ignore teardown errors from already-stopped nodes
      }

      source.disconnect()
      gainNode.disconnect()
      audioContext.close().catch(() => {})
      contextRef.current = null
    }
  }, [enabled, gainLevel])
}