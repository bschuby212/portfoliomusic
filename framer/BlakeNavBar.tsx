/**
 * Blake Nav Bar — Framer Code Component (paste / agent source of truth)
 *
 * Two glassmorphic pills (fixed 720×56 frame, overflow visible, no scrollbars):
 * [avatar · About · Work · Why I'm looking · LinkedIn · Email · Resume] · music
 *
 * Links (defaults):
 *  - Avatar → https://blakeschubert.com/
 *  - About → https://blakeschubert.com/about
 *  - Work → https://blakeschubert.com/#all-campus  (Selected Work)
 *  - Why I'm looking → https://blakeschubert.com/#why-im-looking
 *
 * Fastest install: give Framer External Agent this file + framer/GIVE_TO_FRAMER_AGENT.md
 * Manual: Assets → Code → New Component → paste entire file → frame 720×56, Overflow Visible
 */
import { addPropertyControls, ControlType } from "framer"
import {
    startTransition,
    useEffect,
    useState,
    useSyncExternalStore,
    type CSSProperties,
    type ReactNode,
} from "react"

type TrackMetadata = {
    title: string
    artist: string | null
    artworkUrl: string | null
    durationMs: number | null
    spotifyUrl: string
    previewUrl: string | null
}

type ResolvedTrack = {
    id: string
    spotifyUrl: string
    audioSrc?: string
    metadata: TrackMetadata | null
    metadataStatus: "idle" | "loading" | "ready" | "error"
}

type ExpandDirection = "up" | "down"

type PlayerState = {
    tracks: ResolvedTrack[]
    queue: number[]
    queueIndex: number
    isPlaying: boolean
    currentTime: number
    duration: number
    volume: number
    muted: boolean
    shuffle: boolean
    repeat: boolean
    expanded: boolean
    expandDirection: ExpandDirection
    volumeOpen: boolean
    hasAudio: boolean
    ready: boolean
    playlistName: string
}

type Props = {
    apiBaseUrl: string
    playlistUrl: string
    playlistName: string
    surpriseAfter: number
    surpriseTrackUrl: string
    /** Closed = collapsed player, Open = expanded panel (canvas preview) */
    variant: "Closed" | "Open"
    homeUrl: string
    aboutUrl: string
    workUrl: string
    lookingUrl: string
    linkedinUrl: string
    email: string
    resumeUrl: string
    brandInitials: string
    logoUrl: string
}

const STORAGE_KEY = "blake-framer-music-player"
const RESTART_THRESHOLD = 3
const RICKROLL_ID = "4cOdK2wGLETKBW3PvgPWqT"

/**
 * Local filler was for early demos. Real playlist is live — keep false.
 */
const USE_FILLER_PLAYLIST = false
const SPOTIFY_EMBED_URL =
    "https://open.spotify.com/embed/playlist/5zXp8gIyEeJteiSZj1RTqJ?utm_source=generator"
const FILLER_TRACKS = [
    {
        id: "4sebUbjqbcgDSwG6PbSGI0",
        spotifyUrl: "https://open.spotify.com/track/4sebUbjqbcgDSwG6PbSGI0",
        audioPath: "/audio/track-a.mp3",
    },
    {
        id: "6gSKswfcoWvaadqvuMF3Y7",
        spotifyUrl: "https://open.spotify.com/track/6gSKswfcoWvaadqvuMF3Y7",
        audioPath: "/audio/track-b.mp3",
    },
    {
        id: "4iEOVEULZRvmzYSZY2ViKN",
        spotifyUrl: "https://open.spotify.com/track/4iEOVEULZRvmzYSZY2ViKN",
        audioPath: "/audio/man-of-the-year.mp3",
    },
    {
        id: "0Fe3WxeO6lZZxj7ytvbDUh",
        spotifyUrl: "https://open.spotify.com/track/0Fe3WxeO6lZZxj7ytvbDUh",
        audioPath: "/audio/track-a.mp3",
    },
    {
        id: "3AJwUDP919kvQ9QcozQPxg",
        spotifyUrl: "https://open.spotify.com/track/3AJwUDP919kvQ9QcozQPxg",
        audioPath: "/audio/track-b.mp3",
    },
    {
        id: "0VjIjW4GlUZAMYd2vXMi3b",
        spotifyUrl: "https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b",
        audioPath: "/audio/man-of-the-year.mp3",
    },
] as const

async function fetchRemotePlaylistTracks(base: string, playlistUrl: string) {
    const response = await fetch(
        `${base}/api/spotify/playlist?url=${encodeURIComponent(playlistUrl)}`,
    )
    if (!response.ok) throw new Error("playlist failed")
    const data = (await response.json()) as {
        tracks: { id: string; spotifyUrl: string }[]
    }
    return data.tracks.map((track) => ({
        id: track.id,
        spotifyUrl: track.spotifyUrl,
        metadata: null,
        metadataStatus: "idle" as const,
    }))
}

const emptyState = (): PlayerState => ({
    tracks: [],
    queue: [],
    queueIndex: 0,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    muted: false,
    shuffle: true,
    repeat: false,
    expanded: false,
    expandDirection: "up",
    volumeOpen: false,
    hasAudio: false,
    ready: false,
    playlistName: "Blake's Playlist",
})


let state = emptyState()
const listeners = new Set<() => void>()
let audio: HTMLAudioElement | null = null
let initializedKey = ""
let pendingAutoplay = false
let endedLock = false
let lastApiBase = ""

function emit() {
    listeners.forEach((listener) => listener())
}

function setState(update: Partial<PlayerState> | ((current: PlayerState) => PlayerState)) {
    state = typeof update === "function" ? update(state) : { ...state, ...update }
    emit()
}

function playableSrc(track: ResolvedTrack | undefined) {
    if (!track) return null
    return track.audioSrc || track.metadata?.previewUrl || null
}

function ensureAudio() {
    if (audio || typeof window === "undefined") return audio
    audio = new Audio()
    audio.preload = "metadata"
    audio.addEventListener("timeupdate", () => {
        if (!state.isPlaying) return
        setState({ currentTime: audio?.currentTime || 0 })
    })
    audio.addEventListener("durationchange", () => {
        const duration = audio && Number.isFinite(audio.duration) ? audio.duration : 0
        setState({ duration: duration > 0 ? duration : 0 })
    })
    audio.addEventListener("play", () => setState({ isPlaying: true }))
    audio.addEventListener("pause", () => setState({ isPlaying: false }))
    audio.addEventListener("ended", () => {
        if (endedLock) return
        endedLock = true
        actions.next(true)
        window.setTimeout(() => {
            endedLock = false
        }, 50)
    })
    audio.addEventListener("error", () =>
        setState({ isPlaying: false, hasAudio: false, duration: 0 }),
    )
    return audio
}

function shuffleArray<T>(items: T[]) {
    const next = [...items]
    for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1))
        const a = next[i]
        const b = next[j]
        if (a === undefined || b === undefined) continue
        next[i] = b
        next[j] = a
    }
    return next
}

function buildOrder(items: ResolvedTrack[], surprise: ResolvedTrack, after: number) {
    const shuffled = shuffleArray(items)
    if (shuffled.length === 0) return [surprise]
    return [...shuffled.slice(0, after), surprise, ...shuffled.slice(after)]
}

function loadCurrent(autoplay: boolean) {
    const el = ensureAudio()
    const trackIndex = state.queue[state.queueIndex]
    const track = typeof trackIndex === "number" ? state.tracks[trackIndex] : undefined
    const src = playableSrc(track)
    if (!el) return
    if (!src) {
        el.pause()
        el.removeAttribute("src")
        setState({ hasAudio: false, currentTime: 0, duration: 0, isPlaying: false })
        if (autoplay && track && track.metadataStatus !== "ready") {
            if (typeof trackIndex === "number") {
                void actions.ensureTrackMetadata(lastApiBase, trackIndex).then(() => {
                    if (playableSrc(currentTrack())) {
                        loadCurrent(true)
                        return
                    }
                    actions.skipUnplayableForward()
                })
            }
        } else if (autoplay) {
            actions.skipUnplayableForward()
        }
        return
    }
    el.src = src
    el.load()
    setState({ hasAudio: true, currentTime: 0, duration: 0 })
    if (autoplay) {
        void el.play().catch(() => setState({ isPlaying: false }))
    } else {
        el.pause()
        setState({ isPlaying: false })
    }
}

function currentTrack() {
    const trackIndex = state.queue[state.queueIndex]
    if (typeof trackIndex !== "number") return undefined
    return state.tracks[trackIndex]
}

function persist() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                volume: state.volume,
                muted: state.muted,
                expanded: state.expanded,
                repeat: state.repeat,
            }),
        )
    } catch {
        // ignore
    }
}

function readPrefs() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        return JSON.parse(raw) as {
            volume?: number
            muted?: boolean
            expanded?: boolean
            repeat?: boolean
        }
    } catch {
        return null
    }
}

const actions = {
    async init(props: Props) {
        const key = `${props.apiBaseUrl}|${props.playlistUrl}|${props.surpriseAfter}|filler:${USE_FILLER_PLAYLIST}`
        if (initializedKey === key && state.tracks.length > 0) return
        initializedKey = key

        const prefs = readPrefs()
        const el = ensureAudio()
        if (el) {
            el.volume = prefs?.volume ?? 0.8
            el.muted = Boolean(prefs?.muted)
        }

        setState({
            ...emptyState(),
            playlistName: props.playlistName || "Blake's Playlist",
            volume: prefs?.volume ?? 0.8,
            muted: Boolean(prefs?.muted),
            expanded: Boolean(prefs?.expanded),
            repeat: Boolean(prefs?.repeat),
            ready: false,
        })

        const base = props.apiBaseUrl.replace(/\/$/, "")
        lastApiBase = base

        try {
            const tracks = USE_FILLER_PLAYLIST
                ? FILLER_TRACKS.map((entry) => ({
                      id: entry.id,
                      spotifyUrl: entry.spotifyUrl,
                      audioSrc: `${base}${entry.audioPath}`,
                      metadata: null,
                      metadataStatus: "idle" as const,
                  }))
                : await fetchRemotePlaylistTracks(base, props.playlistUrl)

            const surprise: ResolvedTrack = {
                id: RICKROLL_ID,
                spotifyUrl: props.surpriseTrackUrl,
                audioSrc: `${base}/audio/never-gonna-give-you-up.mp3`,
                metadata: null,
                metadataStatus: "idle",
            }

            const ordered = buildOrder(tracks, surprise, Math.max(1, props.surpriseAfter || 4))
            setState({
                tracks: ordered,
                queue: ordered.map((_, index) => index),
                queueIndex: 0,
                ready: true,
                hasAudio: Boolean(playableSrc(ordered[0])),
            })
            loadCurrent(false)
            await actions.ensureNearbyMetadata(base)
        } catch {
            const tracks = FILLER_TRACKS.map((entry) => ({
                id: entry.id,
                spotifyUrl: entry.spotifyUrl,
                audioSrc: `${base}${entry.audioPath}`,
                metadata: null,
                metadataStatus: "idle" as const,
            }))
            const surprise: ResolvedTrack = {
                id: RICKROLL_ID,
                spotifyUrl: props.surpriseTrackUrl,
                audioSrc: `${base}/audio/never-gonna-give-you-up.mp3`,
                metadata: null,
                metadataStatus: "idle",
            }
            const ordered = buildOrder(tracks, surprise, Math.max(1, props.surpriseAfter || 4))
            setState({
                tracks: ordered,
                queue: ordered.map((_, index) => index),
                queueIndex: 0,
                ready: true,
                hasAudio: Boolean(playableSrc(ordered[0])),
            })
            loadCurrent(false)
            await actions.ensureNearbyMetadata(base)
        }
    },

    async ensureNearbyMetadata(apiBaseUrl: string) {
        const indexes = [state.queueIndex, state.queueIndex + 1]
            .map((pos) => state.queue[pos])
            .filter((value): value is number => typeof value === "number")
        await Promise.all(indexes.map((index) => actions.ensureTrackMetadata(apiBaseUrl, index)))
    },

    async ensureTrackMetadata(apiBaseUrl: string, trackIndex: number) {
        const track = state.tracks[trackIndex]
        if (!track || track.metadataStatus === "ready" || track.metadataStatus === "loading") return

        setState((current) => {
            const tracks = current.tracks.slice()
            const existing = tracks[trackIndex]
            if (!existing) return current
            tracks[trackIndex] = { ...existing, metadataStatus: "loading" }
            return { ...current, tracks }
        })

        try {
            const base = apiBaseUrl.replace(/\/$/, "")
            const response = await fetch(
                `${base}/api/spotify?url=${encodeURIComponent(track.spotifyUrl)}`,
            )
            if (!response.ok) throw new Error("meta failed")
            const metadata = (await response.json()) as TrackMetadata
            let shouldReload = false

            setState((current) => {
                const tracks = current.tracks.slice()
                const existing = tracks[trackIndex]
                if (!existing) return current
                const updated = { ...existing, metadata, metadataStatus: "ready" as const }
                tracks[trackIndex] = updated
                const isCurrent = current.queue[current.queueIndex] === trackIndex
                if (isCurrent && playableSrc(updated) && !playableSrc(existing)) shouldReload = true
                return {
                    ...current,
                    tracks,
                    hasAudio: isCurrent ? Boolean(playableSrc(updated)) : current.hasAudio,
                }
            })

            if (shouldReload) {
                const shouldPlay = pendingAutoplay || state.isPlaying
                pendingAutoplay = false
                loadCurrent(shouldPlay)
            } else {
                const isCurrent = state.queue[state.queueIndex] === trackIndex
                if (
                    isCurrent &&
                    !playableSrc(state.tracks[trackIndex]) &&
                    (pendingAutoplay || state.isPlaying)
                ) {
                    pendingAutoplay = false
                    actions.skipUnplayableForward()
                }
            }
        } catch {
            setState((current) => {
                const tracks = current.tracks.slice()
                const existing = tracks[trackIndex]
                if (!existing) return current
                tracks[trackIndex] = { ...existing, metadataStatus: "error" }
                return { ...current, tracks }
            })
            if (
                state.queue[state.queueIndex] === trackIndex &&
                (pendingAutoplay || state.isPlaying)
            ) {
                pendingAutoplay = false
                actions.skipUnplayableForward()
            }
        }
    },

    togglePlay(apiBaseUrl: string) {
        const el = ensureAudio()
        if (!el) return
        const trackIndex = state.queue[state.queueIndex]
        const track = typeof trackIndex === "number" ? state.tracks[trackIndex] : undefined
        const src = playableSrc(track)

        if (!src) {
            void (async () => {
                if (typeof trackIndex !== "number") return
                await actions.ensureTrackMetadata(apiBaseUrl, trackIndex)
                const ready = playableSrc(
                    state.tracks[state.queue[state.queueIndex] as number],
                )
                if (!ready || !audio) return
                void audio.play().catch(() => setState({ isPlaying: false }))
            })()
            return
        }

        if (state.isPlaying) {
            el.pause()
            return
        }
        void el.play().catch(() => setState({ isPlaying: false }))
    },

    next(fromEnded = false, apiBaseUrl = "") {
        if (fromEnded && state.repeat) {
            if (audio) {
                audio.currentTime = 0
                void audio.play().catch(() => setState({ isPlaying: false }))
            }
            setState({ currentTime: 0 })
            return
        }
        const nextIndex = state.queueIndex + 1
        // Always wrap so collapsed preview keeps looping.
        if (nextIndex >= state.queue.length) {
            pendingAutoplay = true
            setState({ queueIndex: 0 })
            loadCurrent(true)
            if (apiBaseUrl || lastApiBase) {
                void actions.ensureNearbyMetadata(apiBaseUrl || lastApiBase)
            }
            return
        }
        pendingAutoplay = true
        setState({ queueIndex: nextIndex })
        loadCurrent(true)
        if (apiBaseUrl || lastApiBase) {
            void actions.ensureNearbyMetadata(apiBaseUrl || lastApiBase)
        }
    },

    /** Advance past tracks with no preview / audioSrc (wraps once through the queue). */
    skipUnplayableForward() {
        const len = state.queue.length
        if (len <= 1) return
        const start = state.queueIndex
        for (let step = 1; step < len; step += 1) {
            const qi = (start + step) % len
            const track = state.tracks[state.queue[qi] ?? -1]
            if (playableSrc(track)) {
                pendingAutoplay = true
                setState({ queueIndex: qi })
                loadCurrent(true)
                if (lastApiBase) void actions.ensureNearbyMetadata(lastApiBase)
                return
            }
            if (track && track.metadataStatus !== "ready" && track.metadataStatus !== "error") {
                pendingAutoplay = true
                setState({ queueIndex: qi })
                loadCurrent(true)
                if (lastApiBase) void actions.ensureNearbyMetadata(lastApiBase)
                return
            }
        }
    },

    previous(apiBaseUrl: string) {
        if (state.currentTime > RESTART_THRESHOLD) {
            if (audio) audio.currentTime = 0
            setState({ currentTime: 0 })
            return
        }
        const previousIndex = state.queueIndex - 1
        pendingAutoplay = true
        setState({ queueIndex: previousIndex < 0 ? Math.max(state.queue.length - 1, 0) : previousIndex })
        loadCurrent(true)
        void actions.ensureNearbyMetadata(apiBaseUrl)
    },

    seek(time: number) {
        if (!audio || !state.hasAudio) return
        audio.currentTime = time
        setState({ currentTime: time })
    },

    setVolume(volume: number) {
        if (!audio) return
        const next = Math.min(1, Math.max(0, volume))
        audio.volume = next
        if (next > 0 && state.muted) {
            audio.muted = false
            setState({ volume: next, muted: false })
        } else {
            setState({ volume: next })
        }
        persist()
    },

    toggleMuted() {
        if (!audio) return
        audio.muted = !state.muted
        setState({ muted: !state.muted })
        persist()
    },

    toggleShuffle() {
        const currentTrackIndex = state.queue[state.queueIndex] ?? 0
        if (!state.shuffle) {
            const sequential = state.tracks.map((_, index) => index)
            const upcoming = shuffleArray(
                sequential.filter((index) => index !== currentTrackIndex),
            )
            setState({
                shuffle: true,
                queue: [currentTrackIndex, ...upcoming],
                queueIndex: 0,
            })
        } else {
            setState({
                shuffle: false,
                queue: state.tracks.map((_, index) => index),
                queueIndex: currentTrackIndex,
            })
        }
        persist()
    },

    toggleRepeat() {
        setState({ repeat: !state.repeat })
        persist()
    },

    setExpanded(expanded: boolean) {
        // Pause HTML preview when opening the Spotify embed so audio doesn’t double up.
        if (expanded && state.isPlaying) {
            audio?.pause()
            setState({ expanded, volumeOpen: false, isPlaying: false })
        } else {
            setState({ expanded, volumeOpen: expanded ? state.volumeOpen : false })
        }
        persist()
    },

    setExpandDirection(expandDirection: ExpandDirection) {
        setState({ expandDirection })
    },

    async syncExpandDirectionFromBackend(apiBaseUrl: string) {
        try {
            const base = apiBaseUrl.replace(/\/$/, "")
            const response = await fetch(`${base}/api/player/config`)
            if (!response.ok) return
            const data = (await response.json()) as { expandDirection?: string }
            if (data.expandDirection === "up" || data.expandDirection === "down") {
                setState({ expandDirection: data.expandDirection })
            }
        } catch {
            // Keep current direction.
        }
    },

    toggleVolumeOpen() {
        setState({ volumeOpen: !state.volumeOpen })
    },
}

function usePlayer() {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener)
            return () => listeners.delete(listener)
        },
        () => state,
        () => emptyState(),
    )
}

function formatTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
    const total = Math.floor(seconds)
    const minutes = Math.floor(total / 60)
    const remainder = total % 60
    return `${minutes}:${remainder.toString().padStart(2, "0")}`
}

function rangeFill(percent: number): CSSProperties {
    const clamped = Math.min(1, Math.max(0, percent)) * 100
    return {
        background: `linear-gradient(to right, #111 ${clamped}%, rgba(17,17,17,0.08) ${clamped}%)`,
    }
}

const REEL_GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz"

function reelForChar(char: string, index: number): string[] {
    if (char === " ") return ["\u00A0", "\u00A0", "\u00A0", "\u00A0"]
    const a = REEL_GLYPHS[(index * 7 + char.charCodeAt(0)) % REEL_GLYPHS.length]
    const b = REEL_GLYPHS[(index * 13 + 11) % REEL_GLYPHS.length]
    return [char, a, b, char]
}

function SlotText({ text }: { text: string }) {
    return (
        <span className="bn-slot" aria-hidden="true">
            {Array.from(text).map((char, index) => {
                const display = char === " " ? "\u00A0" : char
                return (
                    <span
                        key={`${char}-${index}`}
                        className="bn-slot-char"
                        style={{ "--i": index } as CSSProperties}
                    >
                        <span className="bn-slot-width">{display}</span>
                        <span className="bn-slot-reel">
                            {reelForChar(char, index).map((glyph, glyphIndex) => (
                                <span key={`${glyph}-${glyphIndex}`} className="bn-slot-glyph">
                                    {glyph}
                                </span>
                            ))}
                        </span>
                    </span>
                )
            })}
        </span>
    )
}

const ICON_SIZE = 16
const ICON_STROKE = 1.75

function StrokeIcon({ children }: { children: ReactNode }) {
    return <span className="bn-icon-face" aria-hidden="true">{children}</span>
}

function LinkedInIcon() {
    return (
        <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
            <rect width="4" height="12" x="2" y="9" rx="0.5" />
            <circle cx="4" cy="4" r="2" />
        </svg>
    )
}

function MailIcon() {
    return (
        <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
            <rect x="2" y="4" width="20" height="16" rx="2" />
        </svg>
    )
}

function FileDownIcon() {
    return (
        <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            <path d="M12 18v-6" />
            <path d="m9 15 3 3 3-3" />
        </svg>
    )
}

const ELEVATE_START_PX = 36
const ELEVATE_END_PX = 168

function elevateFromScrollY(scrollY: number): number {
    if (scrollY <= ELEVATE_START_PX) return 0
    if (scrollY >= ELEVATE_END_PX) return 1
    const t = (scrollY - ELEVATE_START_PX) / (ELEVATE_END_PX - ELEVATE_START_PX)
    const s = t * t * (3 - 2 * t)
    return 1 - (1 - s) ** 1.35
}

let elevateCache = 0

function subscribeElevate(onStoreChange: () => void) {
    let frame = 0
    const publish = () => {
        const next =
            Math.round(
                elevateFromScrollY(window.scrollY || window.pageYOffset || 0) * 1000,
            ) / 1000
        if (next === elevateCache) return
        elevateCache = next
        onStoreChange()
    }
    const onScroll = () => {
        if (frame) return
        frame = window.requestAnimationFrame(() => {
            frame = 0
            publish()
        })
    }
    publish()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })
    return () => {
        if (frame) window.cancelAnimationFrame(frame)
        window.removeEventListener("scroll", onScroll)
        window.removeEventListener("resize", onScroll)
    }
}

function getElevateSnapshot() {
    return elevateCache
}

function getElevateServerSnapshot() {
    return 0
}

function useNavElevate() {
    const elevate = useSyncExternalStore(
        subscribeElevate,
        getElevateSnapshot,
        getElevateServerSnapshot,
    )
    const ready = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false,
    )
    return { elevate, ready }
}

/**
 * Fixed embed chrome: collapsed pills only. Expanded player overflows visibly.
 * Top of page: responsive text-only nav. After scroll: glass optic pill.
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 720
 * @framerIntrinsicHeight 56
 */
const css = `
.bn-shell {
  --pn-elevate: 0;
  position: relative;
  box-sizing: border-box;
  width: 720px;
  height: 56px;
  max-width: 720px;
  max-height: 56px;
  min-width: 720px;
  min-height: 56px;
  margin: 0;
  padding: 0;
  overflow: visible;
  overscroll-behavior: none;
  scrollbar-width: none;
  -ms-overflow-style: none;
  pointer-events: none;
  background: transparent;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
}
.bn-shell::-webkit-scrollbar { display: none; width: 0; height: 0; }
.bn-root {
  position: absolute;
  top: 0; left: 0; z-index: 1;
  display: flex; align-items: flex-start; justify-content: center;
  gap: calc(1.25rem - (var(--pn-elevate) * 0.25rem));
  width: 720px; height: 56px; max-width: 720px; max-height: 56px;
  overflow: visible; overscroll-behavior: none;
  scrollbar-width: none; -ms-overflow-style: none; pointer-events: none;
  transform: translate3d(0, calc((1 - var(--pn-elevate)) * 2px), 0);
}
.bn-root::-webkit-scrollbar { display: none; width: 0; height: 0; }
.bn, .bn-music { --ink: #212324; --muted: #6a6a6a; --ease: cubic-bezier(.32,.72,0,1); }
.bn {
  pointer-events: auto; position: relative;
  display: flex; align-items: center;
  gap: calc(.55rem - (var(--pn-elevate) * .2rem));
  min-height: calc(3.15rem + (var(--pn-elevate) * .25rem));
  flex: 0 1 auto; width: max-content;
  min-width: calc((1 - var(--pn-elevate)) * 560px);
  max-width: 560px;
  padding:
    calc(.48rem - (var(--pn-elevate) * .16rem))
    calc(.72rem - (var(--pn-elevate) * .34rem))
    calc(.48rem - (var(--pn-elevate) * .16rem))
    calc(.55rem - (var(--pn-elevate) * .23rem));
  color: var(--ink);
  background-color: rgba(250, 249, 246, calc(.35 * var(--pn-elevate)));
  background-image: linear-gradient(155deg, rgba(255,255,255,calc(1 * var(--pn-elevate))) 0%, rgba(255,255,255,calc(.54 * var(--pn-elevate))) 55%, rgba(255,255,255,calc(.76 * var(--pn-elevate))) 100%);
  border: 1px solid rgba(255,255,255,calc(1 * var(--pn-elevate)));
  border-radius: 999px;
  box-shadow: 0 1px 0 rgba(255,255,255,calc(.8 * var(--pn-elevate))) inset, 0 -1px 0 rgba(255,255,255,calc(.22 * var(--pn-elevate))) inset, 0 0 0 .5px rgba(0,0,0,calc(.045 * var(--pn-elevate))), 0 10px 28px rgba(0,0,0,calc(.07 * var(--pn-elevate)));
  backdrop-filter: blur(calc((var(--pn-elevate) * var(--pn-elevate) * 48px) + (var(--pn-elevate) * 70px))) saturate(calc(100% + (var(--pn-elevate) * 80%)));
  -webkit-backdrop-filter: blur(calc((var(--pn-elevate) * var(--pn-elevate) * 48px) + (var(--pn-elevate) * 70px))) saturate(calc(100% + (var(--pn-elevate) * 80%)));
  isolation: isolate; overflow: visible;
}
.bn-links {
  display: flex; align-items: center; gap: .12rem; margin-left: .15rem; min-width: 0;
  flex: calc(1 - var(--pn-elevate)) 1 auto; justify-content: center;
}
.bn-music {
  pointer-events: auto; position: relative; display: block;
  flex-shrink: 0; width: 9.2rem; height: 3.4rem; overflow: visible;
}
.bmp {
  position: absolute; top: 0; left: 0; z-index: 2;
  width: 9.2rem; min-height: 3.4rem;
  display: flex; flex-direction: column; justify-content: center;
  color: #212324;
  background-color: rgba(250, 249, 246, calc(.35 * var(--pn-elevate)));
  background-image: linear-gradient(155deg, rgba(255,255,255,calc(1 * var(--pn-elevate))) 0%, rgba(255,255,255,calc(.54 * var(--pn-elevate))) 55%, rgba(255,255,255,calc(.76 * var(--pn-elevate))) 100%);
  border: 1px solid rgba(255,255,255,calc(1 * var(--pn-elevate)));
  border-radius: 999px; overflow: hidden;
  box-shadow: 0 1px 0 rgba(255,255,255,calc(.8 * var(--pn-elevate))) inset, 0 -1px 0 rgba(255,255,255,calc(.22 * var(--pn-elevate))) inset, 0 0 0 .5px rgba(0,0,0,calc(.045 * var(--pn-elevate))), 0 10px 28px rgba(0,0,0,calc(.07 * var(--pn-elevate)));
  backdrop-filter: blur(calc((var(--pn-elevate) * var(--pn-elevate) * 48px) + (var(--pn-elevate) * 70px))) saturate(calc(100% + (var(--pn-elevate) * 80%)));
  -webkit-backdrop-filter: blur(calc((var(--pn-elevate) * var(--pn-elevate) * 48px) + (var(--pn-elevate) * 70px))) saturate(calc(100% + (var(--pn-elevate) * 80%)));
  transform-origin: top left; isolation: isolate;
  transition: width .42s var(--ease), min-height .42s var(--ease), border-radius .42s var(--ease), box-shadow .42s ease, background .3s ease;
}
.bmp[data-embedded="true"][data-expanded="true"] {
  width: min(24rem, 100%); max-width: 24rem; border-radius: 1.3rem;
  background-color: rgba(250, 249, 246, calc(.35 * max(var(--pn-elevate), .35)));
  background-image: linear-gradient(160deg, rgba(255,255,255,calc(1 * max(var(--pn-elevate), .35))) 0%, rgba(255,255,255,calc(.76 * max(var(--pn-elevate), .35))) 100%);
  border-color: rgba(255,255,255,calc(1 * max(var(--pn-elevate), .35)));
  box-shadow: 0 1px 0 rgba(255,255,255,calc(.78 * max(var(--pn-elevate), .35))) inset, 0 -1px 0 rgba(255,255,255,calc(.2 * max(var(--pn-elevate), .35))) inset, 0 0 0 .5px rgba(0,0,0,calc(.045 * max(var(--pn-elevate), .35))), 0 16px 40px rgba(0,0,0,calc(.09 * max(var(--pn-elevate), .35)));
}
.bn-sr {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
.bn-link, .bn-icon-btn {
  position: relative; display: inline-flex; align-items: center; justify-content: center;
  min-height: 2.45rem; padding: 0 .95rem; border: 0; border-radius: 999px;
  background: transparent; color: rgba(33,35,36,calc(.72 + (.16 * var(--pn-elevate)))); font: inherit; font-size: .875rem; font-weight: 560;
  font-weight: 560; letter-spacing: normal; text-decoration: none; cursor: pointer;
  overflow: hidden; white-space: nowrap;
  transition: background .22s ease, color .22s ease, box-shadow .22s ease, transform .18s var(--ease);
}
.bn-shell[data-elevate="0"] .bn-link,
.bn-shell[data-elevate="1"] .bn-link,
.bn-shell[data-elevate="1"] .bn-link:hover,
.bn-shell[data-elevate="1"] .bn-icon-btn:hover,
.bn-shell[data-elevate="1"] .bn-link[data-active="true"] { color: #212324; }
.bn-link:hover, .bn-icon-btn:hover { background: rgba(0,0,0,.045); color: var(--ink); }
.bn-link[aria-current="page"], .bn-link[data-active="true"] {
  color: var(--ink); background: rgba(0,0,0,calc(.06 * max(var(--pn-elevate), .4))); box-shadow: none;
}
.bn-slot { display: inline-flex; align-items: baseline; height: 1em; letter-spacing: normal; white-space: nowrap; }
.bn-slot-char { position: relative; display: inline-block; height: 1em; overflow: hidden; vertical-align: baseline; line-height: 1; }
.bn-slot-width { display: inline-block; visibility: hidden; line-height: 1; }
.bn-slot-reel {
  position: absolute; top: 0; left: 50%;
  display: flex; flex-direction: column; align-items: center; width: max-content;
  will-change: transform; transform: translate3d(-50%,0,0);
  transition: transform .58s var(--ease); transition-delay: calc(var(--i, 0) * 34ms);
}
.bn-slot-glyph { display: flex; align-items: center; justify-content: center; height: 1em; line-height: 1; }
.bn-link:hover .bn-slot-reel, .bn-link:focus-visible .bn-slot-reel { transform: translate3d(-50%,-75%,0); }
.bn-link:not(:hover):not(:focus-visible) .bn-slot-reel {
  transition-duration: .32s; transition-delay: calc(var(--i, 0) * 14ms);
}
.bn-icon-btn { width: 2.45rem; padding: 0; color: rgba(33,35,36,calc(.58 + (.3 * var(--pn-elevate)))); font-size: .72rem; font-weight: 560; }
.bn-icon-face svg { width:16px; height:16px; display:block; }
.bn-icon-btn:hover { color: var(--ink); background: rgba(0,0,0,.055); }
.bn-icon-face {
  display: inline-flex; align-items: center; justify-content: center;
  width: 1.25rem; height: 1.15rem; transform-origin: center;
  will-change: transform; transition: transform .28s var(--ease);
}
.bn-fx-spin:hover .bn-icon-face, .bn-fx-spin:focus-visible .bn-icon-face { animation: bn-fx-spin .55s var(--ease) both; }
@keyframes bn-fx-spin {
  0% { transform: rotate(0deg) scale(1); }
  35% { transform: rotate(-22deg) scale(1.2); }
  70% { transform: rotate(10deg) scale(1.06); }
  100% { transform: rotate(0deg) scale(1.1); }
}
.bn-fx-lift:hover .bn-icon-face, .bn-fx-lift:focus-visible .bn-icon-face { animation: bn-fx-lift .58s var(--ease) both; }
@keyframes bn-fx-lift {
  0% { transform: translateY(0) rotate(0deg); }
  30% { transform: translateY(-6px) rotate(-8deg); }
  58% { transform: translateY(-2px) rotate(5deg); }
  100% { transform: translateY(-3px) rotate(0deg); }
}
.bn-fx-nudge:hover .bn-icon-face, .bn-fx-nudge:focus-visible .bn-icon-face { animation: bn-fx-nudge .52s var(--ease) both; }
@keyframes bn-fx-nudge {
  0% { transform: translateY(0) scale(1); }
  28% { transform: translateY(5px) scale(.94); }
  58% { transform: translateY(-2px) scale(1.06); }
  100% { transform: translateY(1px) scale(1.04); }
}
.bn-avatar {
  position: relative; display: inline-flex; align-items: center; justify-content: center;
  width: 2.55rem; height: 2.55rem; flex-shrink: 0; border-radius: 50%; overflow: hidden;
  background: #e8e6e1; color: #fff; text-decoration: none;
  box-shadow: 0 0 0 1px rgba(255,255,255,calc(.18 * max(var(--pn-elevate), .35))) inset, 0 0 0 1.5px rgba(255,255,255,calc(.55 * max(var(--pn-elevate), .45))), 0 0 0 2.5px rgba(0,0,0,calc(.04 * max(var(--pn-elevate), .3)));
  transition: transform .28s var(--ease), box-shadow .28s ease;
}
.bn-avatar-img { width:100%; height:100%; object-fit:cover; object-position:center 28%; display:block; image-rendering:auto; transform:translateZ(0) scale(1.04); transform-origin:center 30%; }
.bn-avatar-mark { font-size: .72rem; font-weight: 680; letter-spacing: .03em; }
.bn-avatar:hover {
  transform: scale(1.06);
  box-shadow: 0 0 0 1px rgba(255,255,255,.28) inset, 0 0 0 1.5px rgba(255,255,255,.75), 0 0 0 3px rgba(0,0,0,.05), 0 8px 20px rgba(0,0,0,.16);
}
.bn-divider {
  width: 1px; height: 1.05rem;
  margin: 0 calc(.35rem + ((1 - var(--pn-elevate)) * .15rem));
  background: rgba(0,0,0,calc(.1 + ((1 - var(--pn-elevate)) * .06)));
  flex-shrink: 0; opacity: calc(.55 + (var(--pn-elevate) * .45));
}
.bn-actions { display: flex; align-items: center; gap: .05rem; margin-right: .05rem; margin-left: calc((1 - var(--pn-elevate)) * .35rem); flex-shrink: 0; }
.bn-toast {
  position: absolute; top: calc(100% + .55rem); left: 50%; transform: translateX(-50%);
  padding: .45rem .75rem; border-radius: 999px; background: #212324; color: #fff;
  font-size: .75rem; font-weight: 550; opacity: 0; pointer-events: none;
}
.bn-toast[data-open="true"] { opacity: 1; }
.bmp[data-playing="true"] .bmp-disc { animation: bmp-disc-live 1.8s ease-out infinite; }
@keyframes bmp-disc-live {
  0% { box-shadow: inset 0 0 0 1px rgba(0,0,0,.06), 0 0 0 0 rgba(33,35,36,.16); }
  70% { box-shadow: inset 0 0 0 1px rgba(0,0,0,.06), 0 0 0 6px rgba(33,35,36,0); }
  100% { box-shadow: inset 0 0 0 1px rgba(0,0,0,.06), 0 0 0 0 rgba(33,35,36,0); }
}
.bmp-collapsed-chevron { color: rgba(33,35,36,.72); font-size: .85rem; line-height: 1; }
.bmp-collapsed-chevron:hover { color: #212324; }
.bmp-embed-bar { display:flex; align-items:center; justify-content:flex-end; min-height:1.75rem; margin-bottom:.25rem; }
.bmp-expanded-embed { padding: .45rem .55rem .6rem !important; }
.bmp-embed-frame { width:100%; max-width:352px; margin:0 auto; border-radius:.75rem; overflow:hidden; background:#000; line-height:0; }
.bmp-embed-frame iframe { display:block; width:100%; height:352px; border:0; }
.bmp-collapsed {
  display: flex; align-items: center; gap: .35rem;
  height: 2.5rem; padding: 0 .3rem 0 .55rem; cursor: pointer;
}
.bmp[data-expanded="true"] .bmp-collapsed { display: none; }
.bmp-icon { width: 1.75rem; text-align: center; font-size: 14px; }
.bmp-icon-btn, .bmp-ctrl {
  border: 0; background: transparent; cursor: pointer; border-radius: 999px;
  width: 1.75rem; height: 1.75rem; display: inline-flex; align-items: center; justify-content: center;
  color: inherit; font-size: 11px;
}
.bmp-ctrl { width: 2.5rem; height: 2.5rem; font-size: 13px; }
.bmp-play { background: #111 !important; color: #fff !important; }
.bmp-ctrl[data-active="true"] { background: rgba(0,0,0,.06); }
.bmp-disc {
  position: relative; width: 1.45rem; height: 1.45rem; flex-shrink: 0;
  border-radius: 50%; overflow: hidden; background: #f0efec;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.06), 0 0 0 1px rgba(255,255,255,.5);
}
.bmp-disc::after {
  content: ""; position: absolute; inset: 50%; width: .28rem; height: .28rem;
  margin: -.14rem 0 0 -.14rem; border-radius: 50%; background: #fff;
  box-shadow: 0 0 0 1px rgba(0,0,0,.08); z-index: 1;
}
.bmp-disc img { width: 100%; height: 100%; object-fit: cover; display: block; }
.bmp-disc-fallback {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  color: #a1a1a1; font-size: 10px;
}
.bmp[data-playing="true"] .bmp-disc img,
.bmp[data-playing="true"] .bmp-disc-fallback { animation: bmp-spin 2.8s linear infinite; }
.bmp-collapsed-play { transition: transform .16s ease, box-shadow .3s ease; }
.bmp[data-playing="true"] .bmp-collapsed-play { animation: bmp-play-pulse 1.8s ease-in-out infinite; }
@keyframes bmp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes bmp-play-pulse {
  0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(17,17,17,0); }
  50% { transform: scale(1.06); box-shadow: 0 0 0 3px rgba(17,17,17,.06); }
}
.bmp[data-expanded="true"][data-playing="true"] .bmp-art { border-radius: 50%; position: relative; }
.bmp[data-expanded="true"][data-playing="true"] .bmp-art img,
.bmp[data-expanded="true"][data-playing="true"] .bmp-art-fallback { animation: bmp-spin 2.8s linear infinite; }
.bmp-art::after {
  content: ""; position: absolute; inset: 50%; width: .45rem; height: .45rem;
  margin: -.225rem 0 0 -.225rem; border-radius: 50%; background: #fff;
  box-shadow: 0 0 0 1px rgba(0,0,0,.08); opacity: 0; z-index: 1; pointer-events: none;
}
.bmp[data-expanded="true"][data-playing="true"] .bmp-art::after { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .bn-root { transform: none; }
  .bn-avatar, .bn-link, .bn-icon-btn, .bmp, .bn-slot-reel, .bn-icon-face {
    transition: none !important; animation: none !important;
  }
  .bn-avatar:hover { transform: none; }
  .bn-link:hover .bn-slot-reel, .bn-link:focus-visible .bn-slot-reel { transform: none; }
  .bn-fx-spin:hover .bn-icon-face, .bn-fx-spin:focus-visible .bn-icon-face,
  .bn-fx-lift:hover .bn-icon-face, .bn-fx-lift:focus-visible .bn-icon-face,
  .bn-fx-nudge:hover .bn-icon-face, .bn-fx-nudge:focus-visible .bn-icon-face { transform: none; }
  .bmp-disc, .bmp-disc img, .bmp-disc-fallback, .bmp-art img, .bmp-art-fallback, .bmp-collapsed-play {
    animation: none !important;
  }
}
.bmp-expanded { display: none; }
.bmp[data-expanded="true"] .bmp-expanded { display: block; }
.bmp-inner { padding: .9rem; }
.bmp-top { display: flex; gap: .75rem; align-items: flex-start; }
.bmp-art {
  position: relative; width: 3.5rem; height: 3.5rem; border-radius: .6rem;
  overflow: hidden; background: #f3f3f1; flex-shrink: 0;
  transition: border-radius .28s ease;
}
.bmp-art img { width: 100%; height: 100%; object-fit: cover; display: block; }
.bmp-art-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #a1a1a1; }
.bmp-meta { min-width: 0; flex: 1; }
.bmp-title, .bmp-artist, .bmp-playlist {
  display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.bmp-title { font-size: .875rem; font-weight: 600; letter-spacing: -.02em; }
.bmp-artist { margin-top: .15rem; font-size: .75rem; color: #737373; }
.bmp-playlist { margin-top: .2rem; font-size: .65rem; color: #a3a3a3; }
.bmp-transport { display: flex; justify-content: space-between; margin-top: .85rem; }
.bmp-progress {
  display: grid; grid-template-columns: 2.1rem 1fr 2.1rem; gap: .45rem; align-items: center; margin-top: .7rem;
}
.bmp-time { font-size: .65rem; color: #a3a3a3; font-variant-numeric: tabular-nums; }
.bmp-time:last-child { text-align: right; }
.bmp-range {
  -webkit-appearance: none; appearance: none; width: 100%; height: 4px; border-radius: 999px;
  background: rgba(0,0,0,.08); outline: none; accent-color: #111;
}
.bmp-range::-webkit-slider-thumb {
  -webkit-appearance: none; width: 10px; height: 10px; border-radius: 50%; background: #111; border: 0;
}
.bmp-footer { display: flex; justify-content: space-between; align-items: center; margin-top: .55rem; }
.bmp-volume { display: flex; align-items: center; gap: .25rem; min-width: 0; }
.bmp-vol { width: 4.5rem; }
.bmp-note { font-size: .65rem; color: #a3a3a3; }
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .bn-shell[data-elevate="1"] .bn { background: #f7f6f3; border-color: rgba(0,0,0,.08); }
}
@media (prefers-reduced-transparency: reduce) {
  .bn-shell[data-elevate="1"] .bn,
  .bn-shell[data-elevate="1"] .bmp {
    background: #f4f3ef; backdrop-filter: none; -webkit-backdrop-filter: none;
  }
  .bn-shell[data-elevate="0"] .bn,
  .bn-shell[data-elevate="0"] .bmp {
    background: transparent; border-color: transparent; box-shadow: none;
  }
}
`

function BlakeNavBar(props: Props) {
    const player = usePlayer()
    const trackIndex = player.queue[player.queueIndex] ?? 0
    const track = player.tracks[trackIndex]
    const [toast, setToast] = useState<string | null>(null)
    const { elevate, ready } = useNavElevate()

    useEffect(() => {
        if (!props.apiBaseUrl) return
        startTransition(() => {
            void actions.init(props)
        })
    }, [props.apiBaseUrl, props.playlistUrl, props.playlistName, props.surpriseAfter, props.surpriseTrackUrl])

    useEffect(() => {
        actions.setExpanded(props.variant === "Open")
    }, [props.variant])

    useEffect(() => {
        actions.setExpandDirection("down")
    }, [])

    useEffect(() => {
        if (!toast) return
        const timer = window.setTimeout(() => setToast(null), 1800)
        return () => window.clearTimeout(timer)
    }, [toast])

    const elevated = elevate >= 0.5

    async function copyEmail() {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(props.email)
            } else {
                const field = document.createElement("textarea")
                field.value = props.email
                field.setAttribute("readonly", "")
                field.style.position = "fixed"
                field.style.opacity = "0"
                document.body.appendChild(field)
                field.select()
                document.execCommand("copy")
                field.remove()
            }
            setToast("Email copied")
        } catch {
            setToast(props.email)
        }
    }

    return (
        <div
            className="bn-shell"
            data-elevate={elevated ? "1" : "0"}
            data-elevate-ready={ready ? "true" : "false"}
            style={
                {
                    "--pn-elevate": String(elevate),
                    width: 720,
                    height: 56,
                    minWidth: 720,
                    minHeight: 56,
                    maxWidth: 720,
                    maxHeight: 56,
                    overflow: "visible",
                    overflowX: "visible",
                    overflowY: "visible",
                    position: "relative",
                    clipPath: "none",
                    contain: "none",
                } as CSSProperties
            }
        >
            <style>{css}</style>
            <div className="bn-root">
                <nav className="bn" aria-label="Blake Schubert primary">
                    <a
                        className="bn-avatar"
                        href={props.homeUrl}
                        aria-label="Home"
                        title="Home"
                    >
                        {props.logoUrl ? (
                            <img className="bn-avatar-img" src={props.logoUrl} alt="" />
                        ) : (
                            <span className="bn-avatar-mark">{props.brandInitials || "BS"}</span>
                        )}
                    </a>
                    <div className="bn-links">
                        <a className="bn-link" href={props.aboutUrl}>
                            <span className="bn-sr">About</span>
                            <SlotText text="About" />
                        </a>
                        <a className="bn-link" href={props.workUrl}>
                            <span className="bn-sr">Work</span>
                            <SlotText text="Work" />
                        </a>
                        <a className="bn-link" href={props.lookingUrl}>
                            <span className="bn-sr">Why I&apos;m looking</span>
                            <SlotText text="Why I'm looking" />
                        </a>
                    </div>
                    <span className="bn-divider" aria-hidden="true" />
                    <div className="bn-actions">
                        <a
                            className="bn-icon-btn bn-fx-spin"
                            href={props.linkedinUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Open LinkedIn profile"
                        >
                            <StrokeIcon><LinkedInIcon /></StrokeIcon>
                        </a>
                        <button
                            type="button"
                            className="bn-icon-btn bn-fx-lift"
                            aria-label={`Copy email ${props.email}`}
                            onClick={() => {
                                void copyEmail()
                            }}
                        >
                            <StrokeIcon><MailIcon /></StrokeIcon>
                        </button>
                        <a
                            className="bn-icon-btn bn-fx-nudge"
                            href={props.resumeUrl}
                            download
                            aria-label="Download resume"
                        >
                            <StrokeIcon><FileDownIcon /></StrokeIcon>
                        </a>
                    </div>
                    <div className="bn-toast" data-open={Boolean(toast)} role="status" aria-live="polite">
                        {toast}
                    </div>
                </nav>

                <div
                    className="bn-music"
                    data-expanded={player.expanded}
                    data-playing={player.isPlaying}
                >
            <aside
                className="bmp"
                data-embedded="true"
                data-expanded={player.expanded}
                data-playing={player.isPlaying}
                data-volume-open={player.volumeOpen}
                data-expand="down"
                aria-label="Music player"
            >
                <div
                    className="bmp-collapsed"
                    role="button"
                    tabIndex={player.expanded ? -1 : 0}
                    aria-label="Expand music player"
                    onClick={() => actions.setExpanded(true)}
                >
                    <span className="bmp-icon" aria-hidden="true">
                        ♪
                    </span>
                    <span className="bmp-disc" aria-hidden="true">
                        {track?.metadata?.artworkUrl ? (
                            <img src={track.metadata.artworkUrl} alt="" />
                        ) : (
                            <span className="bmp-disc-fallback">♪</span>
                        )}
                    </span>
                    <button
                        type="button"
                        className="bmp-icon-btn bmp-collapsed-play"
                        disabled={!player.ready}
                        aria-label={player.isPlaying ? "Pause" : "Play"}
                        onClick={(event) => {
                            event.stopPropagation()
                            actions.togglePlay(props.apiBaseUrl)
                        }}
                    >
                        {player.isPlaying ? "❚❚" : "▶"}
                    </button>
                    <button
                        type="button"
                        className="bmp-icon-btn bmp-collapsed-chevron"
                        aria-label="Expand music player"
                        onClick={(event) => {
                            event.stopPropagation()
                            actions.setExpanded(true)
                        }}
                    >
                        ▾
                    </button>
                </div>

                <div className="bmp-expanded">
                    <div className="bmp-inner bmp-expanded-embed">
                        <div className="bmp-embed-bar">
                            <button
                                type="button"
                                className="bmp-icon-btn"
                                aria-label="Collapse"
                                onClick={() => actions.setExpanded(false)}
                            >
                                ▴
                            </button>
                        </div>
                        <div className="bmp-embed-frame">
                            <iframe
                                title="Spotify playlist"
                                src={SPOTIFY_EMBED_URL}
                                width="100%"
                                height={352}
                                frameBorder={0}
                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                loading="lazy"
                                allowFullScreen
                            />
                        </div>
                    </div>
                </div>
            </aside>
                </div>
            </div>
        </div>
    )
}

BlakeNavBar.defaultProps = {
    apiBaseUrl: "https://blake-music-player.netlify.app",
    playlistUrl: "https://open.spotify.com/playlist/5zXp8gIyEeJteiSZj1RTqJ",
    playlistName: "Blake's Playlist",
    surpriseAfter: 4,
    surpriseTrackUrl: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
    variant: "Closed",
    homeUrl: "https://blakeschubert.com/",
    aboutUrl: "https://blakeschubert.com/about",
    workUrl: "https://blakeschubert.com/#all-campus",
    lookingUrl: "https://blakeschubert.com/#why-im-looking",
    linkedinUrl: "https://www.linkedin.com/in/",
    email: "hello@blakeschubert.com",
    resumeUrl: "https://blake-music-player.netlify.app/resume.pdf",
    brandInitials: "BS",
    logoUrl: "https://blake-music-player.netlify.app/avatar.png",
}

addPropertyControls(BlakeNavBar, {
    variant: {
        type: ControlType.Enum,
        title: "Player",
        options: ["Closed", "Open"],
        optionTitles: ["Closed", "Open"],
        defaultValue: "Closed",
        displaySegmentedControl: true,
    },
    apiBaseUrl: {
        type: ControlType.String,
        title: "API Base URL",
        defaultValue: "https://blake-music-player.netlify.app",
    },
    homeUrl: {
        type: ControlType.String,
        title: "Home URL",
        defaultValue: "https://blakeschubert.com/",
    },
    aboutUrl: {
        type: ControlType.String,
        title: "About URL",
        defaultValue: "https://blakeschubert.com/about",
    },
    workUrl: {
        type: ControlType.String,
        title: "Work URL",
        defaultValue: "https://blakeschubert.com/#all-campus",
    },
    lookingUrl: {
        type: ControlType.String,
        title: "Looking URL",
        defaultValue: "https://blakeschubert.com/#why-im-looking",
    },
    linkedinUrl: {
        type: ControlType.String,
        title: "LinkedIn URL",
        defaultValue: "https://www.linkedin.com/in/blake-schubert/",
    },
    email: {
        type: ControlType.String,
        title: "Email",
        defaultValue: "hello@blakeschubert.com",
    },
    resumeUrl: {
        type: ControlType.String,
        title: "Resume URL",
        defaultValue: "https://blake-music-player.netlify.app/resume.pdf",
    },
    brandInitials: {
        type: ControlType.String,
        title: "Avatar initials",
        defaultValue: "BS",
    },
    logoUrl: {
        type: ControlType.String,
        title: "Logo URL",
        defaultValue: "https://blake-music-player.netlify.app/avatar.png",
    },
    playlistUrl: {
        type: ControlType.String,
        title: "Playlist URL",
        defaultValue: "https://open.spotify.com/playlist/5zXp8gIyEeJteiSZj1RTqJ",
    },
    playlistName: {
        type: ControlType.String,
        title: "Playlist Name",
        defaultValue: "Blake's Playlist",
    },
    surpriseAfter: {
        type: ControlType.Number,
        title: "Surprise After",
        defaultValue: 4,
        min: 1,
        max: 20,
        step: 1,
        displayStepper: true,
    },
    surpriseTrackUrl: {
        type: ControlType.String,
        title: "Surprise Track",
        defaultValue: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
    },
})

export default BlakeNavBar
