"use client"

import { useRef, useEffect, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useGLTF, OrbitControls } from "@react-three/drei"

function AvatarModel({ mouthOpen = 0, speaking = false, audioData = null }) {
  const group = useRef()
  const headRef = useRef()
  const { scene } = useGLTF("https://models.readyplayer.me/68514be56a740807c4053ab1.glb", true)

  const [headRotation, setHeadRotation] = useState({ x: 0, y: 0, z: 0 })
  const [blinkTimer, setBlinkTimer] = useState(0)
  const [eyeBlinkValue, setEyeBlinkValue] = useState(0)
  const [morphTargetObjects, setMorphTargetObjects] = useState([])
  const [availableTargets, setAvailableTargets] = useState({})
  const [speechPattern, setSpeechPattern] = useState({ intensity: 0, rhythm: 0, variation: 0 })

  // Find and log ALL morph targets
  useEffect(() => {
    if (scene) {
      const objects = []
      const allTargets = {}

      scene.traverse((obj) => {
        if (obj.morphTargetDictionary && obj.morphTargetInfluences) {
          console.log("🎭 FOUND MORPH TARGETS:", Object.keys(obj.morphTargetDictionary))

          objects.push({
            object: obj,
            dictionary: obj.morphTargetDictionary,
            influences: obj.morphTargetInfluences,
          })

          // Store all available targets
          Object.keys(obj.morphTargetDictionary).forEach((key) => {
            allTargets[key.toLowerCase()] = {
              originalName: key,
              index: obj.morphTargetDictionary[key],
              object: obj,
            }
          })

          headRef.current = obj
        }
      })

      setMorphTargetObjects(objects)
      setAvailableTargets(allTargets)
      console.log("🎭 HUMANIZED LIP-SYNC READY")
    }
  }, [scene])

  // HUMANIZED LIP-SYNC SYSTEM
  useEffect(() => {
    if (!speaking || !audioData || morphTargetObjects.length === 0) {
      // Smooth reset when not speaking
      morphTargetObjects.forEach(({ influences, dictionary }) => {
        Object.keys(dictionary).forEach((key) => {
          const index = dictionary[key]
          if (influences[index] !== undefined) {
            influences[index] *= 0.85 // Gradual fade out
          }
        })
      })
      return
    }

    const { volume, lowFreq, midFreq, highFreq, frequencies } = audioData
    const time = Date.now() * 0.001

    if (volume > 0.03) {
      // HUMAN SPEECH ANALYSIS
      const veryLowFreq = frequencies.slice(0, 8).reduce((sum, val) => sum + val, 0) / 8 / 255
      const lowMidFreq = frequencies.slice(8, 20).reduce((sum, val) => sum + val, 0) / 12 / 255
      const midHighFreq = frequencies.slice(20, 40).reduce((sum, val) => sum + val, 0) / 20 / 255
      const highestFreq = frequencies.slice(40, 60).reduce((sum, val) => sum + val, 0) / 20 / 255

      // NATURAL SPEECH PATTERNS
      const speechIntensity = Math.min(1.0, volume * 3.0)
      const speechRhythm = Math.sin(time * 8) * 0.15 + 0.85
      const naturalVariation = Math.sin(time * 12.5) * 0.1 + Math.cos(time * 7.3) * 0.05

      // PHONEME-BASED MOUTH SHAPES
      let mouthOpenValue = 0
      let mouthWideValue = 0
      let jawOpenValue = 0
      let lipPuckerValue = 0
      let mouthSmileValue = 0

      // VOWEL SOUNDS (A, E, I, O, U) - Low frequencies
      if (veryLowFreq > 0.15) {
        mouthOpenValue = Math.min(0.9, (veryLowFreq * 2.5 + naturalVariation) * speechRhythm)
        mouthWideValue = Math.min(0.4, veryLowFreq * 1.2)
        console.log("🗣️ VOWEL DETECTED - Mouth Open:", (mouthOpenValue * 100).toFixed(0) + "%")
      }

      // CONSONANTS (B, P, M, F, V) - Mid frequencies
      if (lowMidFreq > 0.12) {
        jawOpenValue = Math.min(0.7, (lowMidFreq * 2.0 + naturalVariation * 0.5) * speechRhythm)
        lipPuckerValue = Math.min(0.3, lowMidFreq * 1.5)
        console.log("🗣️ CONSONANT DETECTED - Jaw:", (jawOpenValue * 100).toFixed(0) + "%")
      }

      // SIBILANTS (S, SH, CH, Z) - High frequencies
      if (midHighFreq > 0.1) {
        mouthSmileValue = Math.min(0.4, (midHighFreq * 1.8 + naturalVariation * 0.3) * speechRhythm)
        mouthOpenValue = Math.max(mouthOpenValue, midHighFreq * 0.6)
        console.log("🗣️ SIBILANT DETECTED - Smile:", (mouthSmileValue * 100).toFixed(0) + "%")
      }

      // FRICATIVES (F, TH, V) - Highest frequencies
      if (highestFreq > 0.08) {
        lipPuckerValue = Math.max(lipPuckerValue, Math.min(0.5, highestFreq * 2.0 * speechRhythm))
        console.log("🗣️ FRICATIVE DETECTED - Pucker:", (lipPuckerValue * 100).toFixed(0) + "%")
      }

      // HUMAN-LIKE VARIATIONS
      const emotionalIntensity = speechIntensity * (1 + Math.sin(time * 3.7) * 0.2)
      const breathingPattern = Math.sin(time * 1.2) * 0.05
      const microExpressions = Math.cos(time * 15.8) * 0.03

      // Apply all values with human-like blending
      mouthOpenValue = Math.min(0.95, mouthOpenValue * emotionalIntensity + breathingPattern)
      jawOpenValue = Math.min(0.8, jawOpenValue * emotionalIntensity + microExpressions)
      mouthWideValue = Math.min(0.5, mouthWideValue * speechRhythm)
      lipPuckerValue = Math.min(0.4, lipPuckerValue * speechRhythm + microExpressions)
      mouthSmileValue = Math.min(0.3, mouthSmileValue * emotionalIntensity)

      // APPLY TO MORPH TARGETS
      morphTargetObjects.forEach(({ object, dictionary, influences }) => {
        // Mouth Opening (Vowels)
        const mouthTargets = ["mouthOpen", "mouth_open", "MouthOpen", "viseme_aa", "viseme_E", "viseme_O"]
        mouthTargets.forEach((targetName) => {
          if (dictionary[targetName] !== undefined) {
            const index = dictionary[targetName]
            if (influences[index] !== undefined) {
              influences[index] = mouthOpenValue
            }
          }
        })

        // Jaw Movement (Consonants)
        const jawTargets = ["jawOpen", "jaw_open", "JawOpen", "Jaw_Open"]
        jawTargets.forEach((targetName) => {
          if (dictionary[targetName] !== undefined) {
            const index = dictionary[targetName]
            if (influences[index] !== undefined) {
              influences[index] = jawOpenValue
            }
          }
        })

        // Mouth Width (Vowels like E, I)
        const wideTargets = ["mouthWide", "mouth_wide", "MouthWide", "viseme_I", "viseme_E"]
        wideTargets.forEach((targetName) => {
          if (dictionary[targetName] !== undefined) {
            const index = dictionary[targetName]
            if (influences[index] !== undefined) {
              influences[index] = mouthWideValue
            }
          }
        })

        // Lip Pucker (O, U sounds)
        const puckerTargets = ["mouthPucker", "mouth_pucker", "viseme_U", "viseme_O"]
        puckerTargets.forEach((targetName) => {
          if (dictionary[targetName] !== undefined) {
            const index = dictionary[targetName]
            if (influences[index] !== undefined) {
              influences[index] = lipPuckerValue
            }
          }
        })

        // Mouth Smile (Sibilants)
        const smileTargets = ["mouthSmile", "mouth_smile", "mouthSmileLeft", "mouthSmileRight"]
        smileTargets.forEach((targetName) => {
          if (dictionary[targetName] !== undefined) {
            const index = dictionary[targetName]
            if (influences[index] !== undefined) {
              influences[index] = mouthSmileValue
            }
          }
        })

        // Fallback for any mouth-related targets
        if (mouthOpenValue > 0.1) {
          Object.keys(dictionary).forEach((key) => {
            const lowerKey = key.toLowerCase()
            if (lowerKey.includes("mouth") || lowerKey.includes("jaw")) {
              const index = dictionary[key]
              if (influences[index] !== undefined && influences[index] === 0) {
                influences[index] = mouthOpenValue * 0.6
              }
            }
          })
        }
      })

      // Update speech pattern for head movements
      setSpeechPattern({
        intensity: speechIntensity,
        rhythm: speechRhythm,
        variation: naturalVariation,
      })
    }

    // Eye blinking with natural timing
    morphTargetObjects.forEach(({ dictionary, influences }) => {
      const eyeTargets = ["eyeBlinkLeft", "eyeBlinkRight", "eye_blink_left", "eye_blink_right", "eyesClose"]
      eyeTargets.forEach((targetName) => {
        if (dictionary[targetName] !== undefined) {
          const index = dictionary[targetName]
          if (influences[index] !== undefined) {
            influences[index] = eyeBlinkValue
          }
        }
      })
    })
  }, [speaking, audioData, eyeBlinkValue, morphTargetObjects])

  // HUMANIZED HEAD MOVEMENTS
  useFrame((state) => {
    if (group.current) {
      const time = state.clock.elapsedTime

      // Natural breathing with slight variation
      group.current.position.y = Math.sin(time * 0.8) * 0.003 + Math.cos(time * 1.3) * 0.001

      // Head movements during speech - more human-like
      if (speaking && audioData && audioData.volume > 0.1) {
        const { intensity, rhythm, variation } = speechPattern
        const emotionalMovement = intensity * 0.5

        setHeadRotation({
          x: (Math.sin(time * 2.3) * 0.025 + Math.cos(time * 4.1) * 0.01) * emotionalMovement + variation * 0.02,
          y: (Math.sin(time * 1.7) * 0.03 + Math.sin(time * 3.2) * 0.015) * emotionalMovement * rhythm,
          z: (Math.sin(time * 2.8) * 0.012 + Math.cos(time * 1.9) * 0.008) * emotionalMovement,
        })
      } else if (speaking) {
        // Gentle movement when speaking but low volume
        setHeadRotation({
          x: Math.sin(time * 1.8) * 0.01 + Math.cos(time * 2.4) * 0.005,
          y: Math.sin(time * 1.4) * 0.015 + Math.sin(time * 2.1) * 0.008,
          z: Math.cos(time * 1.6) * 0.006,
        })
      } else {
        // Very subtle idle movement - more natural
        setHeadRotation({
          x: Math.sin(time * 0.3) * 0.005 + Math.cos(time * 0.7) * 0.002,
          y: Math.sin(time * 0.4) * 0.008 + Math.cos(time * 0.9) * 0.003,
          z: Math.sin(time * 0.5) * 0.003,
        })
      }

      group.current.rotation.x = headRotation.x
      group.current.rotation.y = headRotation.y
      group.current.rotation.z = headRotation.z
    }

    // NATURAL BLINKING PATTERNS
    setBlinkTimer((prev) => prev + 0.016)
    const blinkInterval = speaking ? 2.5 + Math.random() * 2.0 : 3.5 + Math.random() * 2.5

    if (blinkTimer > blinkInterval) {
      setBlinkTimer(0)
      const blinkDuration = 0.08 + Math.random() * 0.06 // Variable blink speed
      const blinkIntensity = 0.7 + Math.random() * 0.3 // Variable blink strength
      const blinkStart = state.clock.elapsedTime

      const animateNaturalBlink = () => {
        const elapsed = state.clock.elapsedTime - blinkStart
        if (elapsed < blinkDuration) {
          // More natural blink curve
          const progress = elapsed / blinkDuration
          const blinkCurve = Math.sin(progress * Math.PI)
          const naturalBlink = blinkCurve * blinkIntensity
          setEyeBlinkValue(naturalBlink)
          requestAnimationFrame(animateNaturalBlink)
        } else {
          setEyeBlinkValue(0)
        }
      }
      animateNaturalBlink()
    }
  })

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  )
}

export default function AvatarLipsync({
  mouthOpen,
  speaking = false,
  cameraPosition = [0, 1.7, 0.8],
  cameraTarget = [0, 1.7, 0],
  audioData = null,
}) {
  return (
    <div className="avatar-face-container">
  <Canvas
    camera={{ position: [0, 1.45, 2.1], fov: 19, near: 0.01, far: 20 }}
    style={{
      width: "100%",
      height: "100%",
      background: "transparent",
      position: "absolute",
      top: 0,
      left: 0
    }}
  >
    <ambientLight intensity={2.0} />
    <directionalLight position={[3, 6, 4]} intensity={1.6} />
    <directionalLight position={[-3, 4, 4]} intensity={0.9} />
    <pointLight position={[0, 5, 2]} intensity={1.0} />
    <spotLight position={[0, 6, 3]} intensity={0.5} angle={0.2} penumbra={0.3} />
    <group position={[0, 0.6, 0]} scale={[1.07, 1.07, 1.07]}>
      <AvatarModel mouthOpen={mouthOpen} speaking={speaking} audioData={audioData} />
    </group>
    <OrbitControls
      enablePan={false}
      enableZoom={false}
      enableRotate={false}
      target={[0, 1.15, 0]}
    />
  </Canvas>
</div>
  )
}
