import { useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'

/* ─── Constants ─── */
const EMOJIS = ['😂', '🥵', '🤢', '💯']
const NEON_PINK = '#ff00ff'
const NEON_GREEN = '#00ff41'
const NEON_PURPLE = '#bd00ff'
const NEON_BLUE = '#00e5ff'
const CHAOS_WORDS = ['离谱', '炸裂', '蚌埠住了', '彻底疯狂', '绝了', '哇塞']
const FALLING_SYMBOLS = ['😂', '🥵', '🤢', '💯', 'Orz', 'QAQ', 'XD', 'TAT', '!', '@', '#', '$', '%', '^', '&', '*']

/* ─── Types ─── */
interface Particle {
  el: SVGTextElement
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  vRot: number
  emoji: string
  scale: number
  hue: number
}

interface FallingChar {
  el: SVGTextElement
  x: number
  y: number
  speed: number
  opacity: number
  isHighlight: boolean
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const defsRef = useRef<SVGDefsElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const fallingCharsRef = useRef<FallingChar[]>([])
  const vortexGroupRef = useRef<SVGGElement>(null)
  const centerEmojiRef = useRef<SVGTextElement>(null)
  const haloRef = useRef<SVGPolygonElement>(null)
  const shockwaveRef = useRef<SVGCircleElement>(null)
  const chaosTextsRef = useRef<SVGGElement>(null)
  const mouseRef = useRef({ x: 0, y: 0, down: false, lastX: 0, lastY: 0 })
  const rafRef = useRef<number>(0)
  const burstTimeRef = useRef(0)
  const dragForceRef = useRef({ fx: 0, fy: 0 })
  const initializedRef = useRef(false)

  /* ─── SVG Filter Setup ─── */
  const setupFilters = useCallback(() => {
    const defs = defsRef.current
    if (!defs) return

    /* Turbulence + Displacement for smear */
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
    filter.setAttribute('id', 'displacementFilter')
    filter.setAttribute('x', '-50%')
    filter.setAttribute('y', '-50%')
    filter.setAttribute('width', '200%')
    filter.setAttribute('height', '200%')

    const turb = document.createElementNS('http://www.w3.org/2000/svg', 'feTurbulence')
    turb.setAttribute('type', 'turbulence')
    turb.setAttribute('baseFrequency', '0.01')
    turb.setAttribute('numOctaves', '3')
    turb.setAttribute('result', 'turbulence')
    turb.setAttribute('seed', '1')
    filter.appendChild(turb)

    const disp = document.createElementNS('http://www.w3.org/2000/svg', 'feDisplacementMap')
    disp.setAttribute('in', 'SourceGraphic')
    disp.setAttribute('in2', 'turbulence')
    disp.setAttribute('scale', '30')
    disp.setAttribute('xChannelSelector', 'R')
    disp.setAttribute('yChannelSelector', 'G')
    filter.appendChild(disp)

    defs.appendChild(filter)

    /* Glow filter */
    const glowFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
    glowFilter.setAttribute('id', 'glow')
    glowFilter.setAttribute('x', '-100%')
    glowFilter.setAttribute('y', '-100%')
    glowFilter.setAttribute('width', '300%')
    glowFilter.setAttribute('height', '300%')

    const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur')
    blur.setAttribute('stdDeviation', '4')
    blur.setAttribute('result', 'coloredBlur')
    glowFilter.appendChild(blur)

    const merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge')
    const mergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode')
    mergeNode1.setAttribute('in', 'coloredBlur')
    const mergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode')
    mergeNode2.setAttribute('in', 'SourceGraphic')
    merge.appendChild(mergeNode1)
    merge.appendChild(mergeNode2)
    glowFilter.appendChild(merge)

    defs.appendChild(glowFilter)

    /* RGB Glitch filters for hover */
    for (let i = 0; i < 3; i++) {
      const gf = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
      gf.setAttribute('id', `glitch${i}`)
      const m = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix')
      m.setAttribute('type', 'matrix')
      if (i === 0) m.setAttribute('values', '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0')
      else if (i === 1) m.setAttribute('values', '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0')
      else m.setAttribute('values', '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0')
      gf.appendChild(m)
      defs.appendChild(gf)
    }

    /* Strong glow for vortex */
    const vortexGlow = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
    vortexGlow.setAttribute('id', 'vortexGlow')
    vortexGlow.setAttribute('x', '-100%')
    vortexGlow.setAttribute('y', '-100%')
    vortexGlow.setAttribute('width', '300%')
    vortexGlow.setAttribute('height', '300%')
    const vb = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur')
    vb.setAttribute('stdDeviation', '12')
    vb.setAttribute('result', 'blur')
    vortexGlow.appendChild(vb)
    const vm = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge')
    const vn1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode')
    vn1.setAttribute('in', 'blur')
    const vn2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode')
    vn2.setAttribute('in', 'SourceGraphic')
    vm.appendChild(vn1)
    vm.appendChild(vn2)
    vortexGlow.appendChild(vm)
    defs.appendChild(vortexGlow)
  }, [])

  /* ─── Background Falling Characters ─── */
  const initFallingChars = useCallback((svg: SVGSVGElement) => {
    const count = 120
    const w = window.innerWidth
    const h = window.innerHeight
    const chars: FallingChar[] = []

    for (let i = 0; i < count; i++) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      const isHighlight = Math.random() > 0.85
      const symbol = FALLING_SYMBOLS[Math.floor(Math.random() * FALLING_SYMBOLS.length)]
      text.textContent = symbol
      text.setAttribute('x', '0')
      text.setAttribute('y', '0')
      text.setAttribute('font-size', `${Math.random() * 14 + 10}`)
      text.setAttribute('font-family', 'JetBrains Mono, monospace')
      text.setAttribute('fill', isHighlight ? NEON_PINK : `rgba(189, 0, 255, ${Math.random() * 0.5 + 0.2})`)
      text.setAttribute('opacity', '0')
      svg.appendChild(text)

      chars.push({
        el: text,
        x: Math.random() * w,
        y: Math.random() * h * 2 - h,
        speed: Math.random() * 2.5 + 0.8,
        opacity: Math.random() * 0.6 + 0.2,
        isHighlight,
      })
    }

    fallingCharsRef.current = chars
  }, [])

  /* ─── Emoji Particles ─── */
  const initParticles = useCallback((svg: SVGSVGElement) => {
    const particles: Particle[] = []
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    const count = 60

    for (let i = 0; i < count; i++) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      const emoji = EMOJIS[i % 4]
      text.textContent = emoji
      text.setAttribute('font-size', '40')
      text.setAttribute('text-anchor', 'middle')
      text.setAttribute('dominant-baseline', 'central')
      text.setAttribute('font-family', '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif')
      text.style.cursor = 'pointer'
      g.appendChild(text)
      svg.appendChild(g)

      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 8 + 4

      particles.push({
        el: text,
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 15,
        emoji,
        scale: Math.random() * 0.8 + 0.5,
        hue: 0,
      })

      /* Hover interaction */
      g.addEventListener('mouseenter', () => {
        triggerGlitch(g, text)
      })
    }

    particlesRef.current = particles
  }, [])

  /* ─── Glitch Effect on Hover ─── */
  const triggerGlitch = useCallback((group: SVGGElement, text: SVGTextElement) => {
    const tl = gsap.timeline()

    // Squash and stretch
    tl.to(group, {
      scaleX: 1.8,
      scaleY: 0.2,
      duration: 0.08,
      ease: 'power4.in',
    })
    .to(group, {
      scaleX: 1,
      scaleY: 1,
      duration: 0.6,
      ease: 'elastic.out(1, 0.3)',
    })

    // Flash scale up
    gsap.fromTo(text,
      { fontSize: 40 },
      { fontSize: 80, duration: 0.15, yoyo: true, repeat: 3, ease: 'power2.inOut' }
    )

    // RGB offset layers
    for (let i = 0; i < 3; i++) {
      const clone = text.cloneNode(true) as SVGTextElement
      clone.setAttribute('filter', `url(#glitch${i})`)
      clone.setAttribute('opacity', '0.8')
      group.appendChild(clone)

      const offsetX = (Math.random() - 0.5) * 40
      gsap.fromTo(clone,
        { x: 0, opacity: 0.8 },
        {
          x: offsetX,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.out',
          onComplete: () => clone.remove(),
        }
      )
    }

    // Spawn chaos text
    spawnChaosText(group)
  }, [])

  /* ─── Chaos Text Spawn ─── */
  const spawnChaosText = useCallback((group: SVGGElement) => {
    const chaosGroup = chaosTextsRef.current
    if (!chaosGroup) return

    const word = CHAOS_WORDS[Math.floor(Math.random() * CHAOS_WORDS.length)]
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.textContent = word
    text.setAttribute('font-size', '24')
    text.setAttribute('font-family', 'Bebas Neue, Impact, sans-serif')
    text.setAttribute('fill', NEON_GREEN)
    text.setAttribute('filter', 'url(#glow)')
    text.setAttribute('text-anchor', 'middle')

    const rect = group.getBoundingClientRect()
    const svgRect = svgRef.current?.getBoundingClientRect()
    if (!svgRect) return

    const x = rect.left - svgRect.left + rect.width / 2 + (Math.random() - 0.5) * 100
    const y = rect.top - svgRect.top + (Math.random() - 0.5) * 60

    text.setAttribute('x', String(x))
    text.setAttribute('y', String(y))
    text.setAttribute('opacity', '1')
    chaosGroup.appendChild(text)

    gsap.to(text, {
      y: y - 80,
      opacity: 0,
      rotation: (Math.random() - 0.5) * 60,
      duration: 1.2,
      ease: 'power2.out',
      onComplete: () => text.remove(),
    })
  }, [])

  /* ─── Screen Shake ─── */
  const screenShake = useCallback((intensity: number) => {
    const container = containerRef.current
    if (!container) return
    gsap.to(container, {
      x: (Math.random() - 0.5) * intensity,
      y: (Math.random() - 0.5) * intensity,
      duration: 0.05,
      repeat: 5,
      yoyo: true,
      ease: 'power1.inOut',
      onComplete: () => gsap.set(container, { x: 0, y: 0 }),
    })
  }, [])

  /* ─── Vortex Setup ─── */
  const initVortex = useCallback(() => {
    const group = vortexGroupRef.current
    const halo = haloRef.current
    const shockwave = shockwaveRef.current
    const centerEmoji = centerEmojiRef.current
    if (!group || !halo || !shockwave || !centerEmoji) return

    // Pulse halo
    gsap.to(halo, {
      scale: 1.3,
      opacity: 0.3,
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      transformOrigin: 'center',
    })

    // Rotate halo
    gsap.to(halo, {
      rotation: 360,
      duration: 20,
      repeat: -1,
      ease: 'none',
      transformOrigin: 'center',
    })

    // Shockwave pulse
    gsap.to(shockwave, {
      r: 200,
      opacity: 0,
      duration: 2,
      repeat: -1,
      ease: 'power2.out',
    })

    // Center emoji pulse
    gsap.to(centerEmoji, {
      scale: 1.15,
      duration: 0.8,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      transformOrigin: 'center',
    })
  }, [])

  /* ─── Animation Loop ─── */
  const animate = useCallback(() => {
    const w = window.innerWidth
    const h = window.innerHeight
    const friction = 0.992
    const gravity = 0.03
    const time = performance.now() / 1000
    burstTimeRef.current += 1

    // Update falling characters
    fallingCharsRef.current.forEach((char) => {
      char.y += char.speed
      if (char.y > h + 20) {
        char.y = -20
        char.x = Math.random() * w
      }

      // Fade in/out near edges
      let op = char.opacity
      if (char.y < 50) op *= char.y / 50
      if (char.y > h - 50) op *= (h - char.y) / 50

      char.el.setAttribute('x', String(char.x))
      char.el.setAttribute('y', String(char.y))
      char.el.setAttribute('opacity', String(op))
    })

    // Update particles
    particlesRef.current.forEach((p) => {
      // Apply drag force from mouse
      p.vx += dragForceRef.current.fx * 0.3
      p.vy += dragForceRef.current.fy * 0.3

      // Apply gravity
      p.vy += gravity

      // Friction
      p.vx *= friction
      p.vy *= friction
      p.vRot *= 0.998

      // Update position
      p.x += p.vx
      p.y += p.vy
      p.rotation += p.vRot

      // Orbit influence from center (vortex pull when close)
      const dx = p.x - w / 2
      const dy = p.y - h / 2
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 200 && dist > 10) {
        const pull = 0.02
        p.vx -= (dx / dist) * pull
        p.vy -= (dy / dist) * pull
      }

      // Bounce off edges
      let bounced = false
      if (p.x < 30) { p.x = 30; p.vx *= -0.85; bounced = true }
      if (p.x > w - 30) { p.x = w - 30; p.vx *= -0.85; bounced = true }
      if (p.y < 30) { p.y = 30; p.vy *= -0.85; bounced = true }
      if (p.y > h - 30) { p.y = h - 30; p.vy *= -0.85; bounced = true }

      if (bounced) {
        p.vRot += (Math.random() - 0.5) * 20
        p.hue = (p.hue + 60) % 360
      }

      // Render
      const parent = p.el.parentNode as SVGGElement
      if (parent) {
        parent.setAttribute('transform', `translate(${p.x}, ${p.y}) rotate(${p.rotation}) scale(${p.scale})`)
      }
      p.el.setAttribute('filter', dist > 150 ? 'url(#glow)' : 'url(#displacementFilter)')

      // Color shift on bounce
      if (bounced && p.hue > 0) {
        p.el.setAttribute('fill', `hsl(${p.hue}, 80%, 60%)`)
      }
    })

    // Turbulence animation for displacement
    const turb = document.querySelector('#displacementFilter feTurbulence') as SVGFETurbulenceElement
    if (turb) {
      turb.setAttribute('baseFrequency', `${0.01 + Math.sin(time) * 0.005}`)
    }

    // Decay drag force
    dragForceRef.current.fx *= 0.9
    dragForceRef.current.fy *= 0.9

    rafRef.current = requestAnimationFrame(animate)
  }, [])

  /* ─── Mouse Handlers ─── */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (mouseRef.current.down) {
      const dx = x - mouseRef.current.lastX
      const dy = y - mouseRef.current.lastY
      dragForceRef.current.fx += dx * 0.5
      dragForceRef.current.fy += dy * 0.5
    }

    mouseRef.current.x = x
    mouseRef.current.y = y
    mouseRef.current.lastX = x
    mouseRef.current.lastY = y
  }, [])

  const handleMouseDown = useCallback((e: MouseEvent) => {
    mouseRef.current.down = true
    const rect = svgRef.current?.getBoundingClientRect()
    if (rect) {
      mouseRef.current.lastX = e.clientX - rect.left
      mouseRef.current.lastY = e.clientY - rect.top
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    mouseRef.current.down = false
  }, [])

  /* ─── Touch Handlers ─── */
  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top

    if (mouseRef.current.down) {
      const dx = x - mouseRef.current.lastX
      const dy = y - mouseRef.current.lastY
      dragForceRef.current.fx += dx * 0.5
      dragForceRef.current.fy += dy * 0.5
    }

    mouseRef.current.lastX = x
    mouseRef.current.lastY = y
  }, [])

  const handleTouchStart = useCallback((e: TouchEvent) => {
    mouseRef.current.down = true
    const touch = e.touches[0]
    const rect = svgRef.current?.getBoundingClientRect()
    if (rect) {
      mouseRef.current.lastX = touch.clientX - rect.left
      mouseRef.current.lastY = touch.clientY - rect.top
    }
  }, [])

  /* ─── Init Effect ─── */
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const svg = svgRef.current
    if (!svg) return

    // Setup
    setupFilters()
    initFallingChars(svg)
    initParticles(svg)
    initVortex()

    // Event listeners
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('touchend', handleMouseUp)

    // Entry animation
    const tl = gsap.timeline({ delay: 0.3 })

    // Flash center
    tl.fromTo(vortexGroupRef.current,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(2)' }
    )

    // Explode particles
    tl.call(() => {
      particlesRef.current.forEach((p, i) => {
        const angle = (i / particlesRef.current.length) * Math.PI * 2 + Math.random() * 0.5
        const speed = Math.random() * 12 + 6
        p.vx = Math.cos(angle) * speed
        p.vy = Math.sin(angle) * speed
        p.vRot = (Math.random() - 0.5) * 30

        gsap.fromTo(p.el,
          { fontSize: 0 },
          {
            fontSize: Math.random() * 30 + 30,
            duration: 0.6,
            delay: Math.random() * 0.3,
            ease: 'back.out(2)',
          }
        )
      })
      screenShake(20)
    }, [], '-=0.4')

    // Start loop
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleMouseUp)
    }
  }, [setupFilters, initFallingChars, initParticles, initVortex, handleMouseMove, handleMouseDown, handleMouseUp, handleTouchMove, handleTouchStart, animate, screenShake])

  /* ─── Hexagon points ─── */
  const hexRadius = 120
  const hexPoints = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * Math.PI) / 3 - Math.PI / 6
    return `${Math.cos(angle) * hexRadius},${Math.sin(angle) * hexRadius}`
  }).join(' ')

  const cx = typeof window !== 'undefined' ? window.innerWidth / 2 : 960
  const cy = typeof window !== 'undefined' ? window.innerHeight / 2 : 540

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: '#000000',
        cursor: 'crosshair',
      }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ display: 'block' }}
      >
        <defs ref={defsRef} />

        {/* Background falling chars layer */}
        <g id="falling-chars-layer" />

        {/* Vortex center */}
        <g
          ref={vortexGroupRef}
          transform={`translate(${cx}, ${cy})`}
          style={{ opacity: 0 }}
        >
          {/* Shockwave */}
          <circle
            ref={shockwaveRef}
            r="60"
            fill="none"
            stroke={NEON_PINK}
            strokeWidth="2"
            opacity="0.6"
            filter="url(#vortexGlow)"
          />

          {/* Hexagon halo */}
          <polygon
            ref={haloRef}
            points={hexPoints}
            fill="none"
            stroke={NEON_BLUE}
            strokeWidth="3"
            opacity="0.5"
            filter="url(#vortexGlow)"
          />

          {/* Secondary rotating ring */}
          <polygon
            points={Array.from({ length: 6 }, (_, i) => {
              const angle = (i * Math.PI) / 3
              const r = 80
              return `${Math.cos(angle) * r},${Math.sin(angle) * r}`
            }).join(' ')}
            fill="none"
            stroke={NEON_PURPLE}
            strokeWidth="2"
            opacity="0.4"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0"
              to="-360"
              dur="12s"
              repeatCount="indefinite"
            />
          </polygon>

          {/* Center combined emoji */}
          <text
            ref={centerEmojiRef}
            fontSize="80"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily='"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
            filter="url(#vortexGlow)"
          >
            😂
          </text>

          {/* Orbiting mini emojis around center */}
          {EMOJIS.map((emoji, i) => {
            const angle = (i / 4) * Math.PI * 2
            const orbitR = 160
            return (
              <g key={i}>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from={`0 0 0`}
                  to={`360 0 0`}
                  dur={`${6 + i * 2}s`}
                  repeatCount="indefinite"
                />
                <text
                  x={Math.cos(angle) * orbitR}
                  y={Math.sin(angle) * orbitR}
                  fontSize="32"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily='"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
                  filter="url(#glow)"
                >
                  {emoji}
                </text>
              </g>
            )
          })}
        </g>

        {/* Particles layer - filled by JS */}
        <g id="particles-layer" />

        {/* Chaos text layer */}
        <g ref={chaosTextsRef} />

        {/* Title */}
        <text
          x="50%"
          y="40"
          textAnchor="middle"
          fontFamily="Bebas Neue, Impact, sans-serif"
          fontSize="28"
          fill={NEON_PINK}
          letterSpacing="8"
          filter="url(#glow)"
          opacity="0.8"
          style={{ pointerEvents: 'none' }}
        >
          EMOTION VORTEX
        </text>

        {/* Bottom instruction */}
        <text
          x="50%"
          y={typeof window !== 'undefined' ? window.innerHeight - 30 : 1050}
          textAnchor="middle"
          fontFamily="JetBrains Mono, monospace"
          fontSize="12"
          fill={NEON_GREEN}
          opacity="0.5"
          style={{ pointerEvents: 'none' }}
        >
          [ DRAG TO STIR ]  [ HOVER EMOJI FOR GLITCH ]
        </text>
      </svg>
    </div>
  )
}
