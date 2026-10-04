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
 *
 * Defaults point at https://genuine-cheesecake-75fecc.netlify.app for API + avatar + resume
 * (absolute URLs — relative /avatar.png paths break when the component runs on Framer).
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

const STORAGE_KEY = "blake-framer-music-player-v3"
const RESTART_THRESHOLD = 3
const RICKROLL_ID = "4cOdK2wGLETKBW3PvgPWqT"

/**
 * Temporary filler playlist with local audio on the Netlify host.
 * Flip to false when Blake sends the real Spotify playlist URL.
 */
const USE_FILLER_PLAYLIST = false
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
    volume: 0.25,
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
    audio.preload = "auto"
    audio.playsInline = true
    audio.setAttribute("playsinline", "true")
    audio.setAttribute("webkit-playsinline", "true")
    audio.volume = state.volume
    audio.muted = state.muted
    audio.addEventListener("timeupdate", () => {
        if (!state.isPlaying) return
        setState({ currentTime: audio?.currentTime || 0 })
    })
    audio.addEventListener("durationchange", () => {
        const duration = audio && Number.isFinite(audio.duration) ? audio.duration : 0
        setState({ duration: duration > 0 ? duration : 0 })
    })
    audio.addEventListener("play", () => setState({ isPlaying: true }))
    audio.addEventListener("pause", () => {
        if (pendingAutoplay) return
        setState({ isPlaying: false })
    })
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

/** Tracks stay [...playlist, surprise]; queue owns shuffle + surprise pin. */
function buildPlaybackQueue(
    playlistLength: number,
    options: { shuffle: boolean; surpriseAfter: number; includeSurprise: boolean },
) {
    const playlistIndices = Array.from({ length: playlistLength }, (_, index) => index)
    const ordered = options.shuffle ? shuffleArray(playlistIndices) : playlistIndices
    if (!options.includeSurprise) return ordered
    const surpriseIndex = playlistLength
    const after = Math.min(Math.max(options.surpriseAfter, 0), ordered.length)
    return [...ordered.slice(0, after), surpriseIndex, ...ordered.slice(after)]
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

function persist() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                volume: state.volume,
                muted: state.muted,
                // Never persist expand — always boot collapsed.
                expanded: false,
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
            el.volume = prefs?.volume ?? 0.25
            el.muted = Boolean(prefs?.muted)
        }

        setState({
            ...emptyState(),
            playlistName: props.playlistName || "Blake's Playlist",
            volume: prefs?.volume ?? 0.25,
            muted: Boolean(prefs?.muted),
            expanded: false,
            repeat: Boolean(prefs?.repeat),
            ready: false,
        })

        const base = props.apiBaseUrl.replace(/\/$/, "")

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

            const ordered = [...tracks, surprise]
            const queue = buildPlaybackQueue(tracks.length, {
                shuffle: true,
                surpriseAfter: Math.max(1, props.surpriseAfter || 4),
                includeSurprise: true,
            })
            setState({
                tracks: ordered,
                queue,
                queueIndex: 0,
                shuffle: true,
                ready: true,
                hasAudio: Boolean(playableSrc(ordered[queue[0] ?? 0])),
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
            const ordered = [...tracks, surprise]
            const queue = buildPlaybackQueue(tracks.length, {
                shuffle: true,
                surpriseAfter: Math.max(1, props.surpriseAfter || 4),
                includeSurprise: true,
            })
            setState({
                tracks: ordered,
                queue,
                queueIndex: 0,
                shuffle: true,
                ready: true,
                hasAudio: Boolean(playableSrc(ordered[queue[0] ?? 0])),
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

    async ensureTrackMetadata(apiBaseUrl: string, trackIndex: number, opts?: { force?: boolean }) {
        const track = state.tracks[trackIndex]
        if (!track) return
        const hasPreview = Boolean(playableSrc(track))
        if (!opts?.force) {
            if (track.metadataStatus === "loading") return
            if (track.metadataStatus === "ready" && hasPreview) return
        }

        setState((current) => {
            const tracks = current.tracks.slice()
            const existing = tracks[trackIndex]
            if (!existing) return current
            tracks[trackIndex] = { ...existing, metadataStatus: "loading" }
            return { ...current, tracks }
        })

        try {
            const base = apiBaseUrl.replace(/\/$/, "")
            const params = new URLSearchParams({ url: track.spotifyUrl })
            if (opts?.force || !hasPreview) params.set("fresh", String(Date.now()))
            const response = await fetch(`${base}/api/spotify?${params.toString()}`, {
                cache: "no-store",
            })
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

            if (shouldReload || (pendingAutoplay && playableSrc(state.tracks[trackIndex]))) {
                const shouldPlay = pendingAutoplay || state.isPlaying
                pendingAutoplay = false
                loadCurrent(shouldPlay)
            }
        } catch {
            setState((current) => {
                const tracks = current.tracks.slice()
                const existing = tracks[trackIndex]
                if (!existing) return current
                tracks[trackIndex] = { ...existing, metadataStatus: "error" }
                return { ...current, tracks }
            })
        }
    },

    togglePlay(apiBaseUrl: string) {
        const el = ensureAudio()
        if (!el) return
        const trackIndex = state.queue[state.queueIndex]
        const track = typeof trackIndex === "number" ? state.tracks[trackIndex] : undefined
        let src = playableSrc(track)

        if (state.isPlaying) {
            pendingAutoplay = false
            el.pause()
            setState({ isPlaying: false })
            return
        }

        el.volume = state.muted ? 0 : state.volume
        el.muted = state.muted
        setState({ isPlaying: true })

        const start = async () => {
            if (typeof trackIndex !== "number") {
                setState({ isPlaying: false })
                return
            }
            if (!src) {
                pendingAutoplay = true
                await actions.ensureTrackMetadata(apiBaseUrl, trackIndex, { force: true })
                src = playableSrc(state.tracks[trackIndex])
            }
            if (!src || !audio) {
                pendingAutoplay = false
                setState({ isPlaying: false, hasAudio: false })
                return
            }
            pendingAutoplay = false
            audio.volume = state.muted ? 0 : state.volume
            audio.muted = state.muted
            if (!audio.getAttribute("src") || !audio.src.includes(src.split("?")[0].slice(-24))) {
                audio.src = src
                audio.load()
            }
            try {
                await audio.play()
            } catch {
                // Retry once with a fresh preview URL (CDNs expire).
                await actions.ensureTrackMetadata(apiBaseUrl, trackIndex, { force: true })
                const retry = playableSrc(state.tracks[trackIndex])
                if (!retry || !audio) {
                    setState({ isPlaying: false })
                    return
                }
                audio.src = retry
                audio.load()
                try {
                    await audio.play()
                } catch {
                    setState({ isPlaying: false })
                }
            }
        }

        void start()
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
        if (nextIndex >= state.queue.length) {
            pendingAutoplay = true
            setState({ queueIndex: 0 })
            loadCurrent(true)
            if (apiBaseUrl) void actions.ensureNearbyMetadata(apiBaseUrl)
            return
        }
        pendingAutoplay = true
        setState({ queueIndex: nextIndex })
        loadCurrent(true)
        if (apiBaseUrl) void actions.ensureNearbyMetadata(apiBaseUrl)
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

    /** Always-on shuffle: click builds a new random order and jumps to a new track. */
    toggleShuffle(apiBaseUrl: string) {
        if (state.tracks.length === 0) return
        const playlistLength = Math.max(state.tracks.length - 1, 0)
        const currentTrackIndex = state.queue[state.queueIndex]
        const wasPlaying = state.isPlaying || pendingAutoplay
        let queue = buildPlaybackQueue(playlistLength, {
            shuffle: true,
            surpriseAfter: 4,
            includeSurprise: state.tracks.length > playlistLength,
        })
        if (
            typeof currentTrackIndex === "number" &&
            queue.length > 1 &&
            queue[0] === currentTrackIndex
        ) {
            const startAt = queue.findIndex((index) => index !== currentTrackIndex)
            if (startAt > 0) queue = [...queue.slice(startAt), ...queue.slice(0, startAt)]
        }
        pendingAutoplay = wasPlaying
        setState({ shuffle: true, queue, queueIndex: 0 })
        loadCurrent(wasPlaying)
        if (apiBaseUrl) void actions.ensureNearbyMetadata(apiBaseUrl)
        persist()
    },

    toggleRepeat() {
        setState({ repeat: !state.repeat })
        persist()
    },

    setExpanded(expanded: boolean) {
        setState({ expanded, volumeOpen: expanded ? state.volumeOpen : false })
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
    // Brand "in" mark — clearer than the stroke outline at 16px.
    return (
        <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V23h-4V8.5zM8.5 8.5h3.84v1.98h.05c.53-1.01 1.84-2.08 3.79-2.08 4.05 0 4.8 2.67 4.8 6.14V23h-4v-6.56c0-1.56-.03-3.57-2.17-3.57-2.18 0-2.51 1.7-2.51 3.46V23h-4V8.5z" transform="translate(1 0.5)" />
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

function PauseBars() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6.5" y="4.5" width="4" height="15" rx="0.75" />
            <rect x="13.5" y="4.5" width="4" height="15" rx="0.75" />
        </svg>
    )
}

function PlayTriangle() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5.5v13l11-6.5L8 5.5z" />
        </svg>
    )
}

function NoteIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
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

function ChevronDownIcon({ size = 15 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
        </svg>
    )
}

function ChevronRightIcon({ size = 15 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
        </svg>
    )
}

function ChevronLeftIcon({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
        </svg>
    )
}

function ShuffleIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m16 3 4 4-4 4" />
            <path d="M20 7H4" />
            <path d="m8 21-4-4 4-4" />
            <path d="M4 17h16" />
        </svg>
    )
}

function SkipBackIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="19 20 9 12 19 4 19 20" fill="currentColor" stroke="none" />
            <line x1="5" x2="5" y1="19" y2="5" />
        </svg>
    )
}

function SkipForwardIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="5 4 15 12 5 20 5 4" fill="currentColor" stroke="none" />
            <line x1="19" x2="19" y1="5" y2="19" />
        </svg>
    )
}

function RepeatIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m17 2 4 4-4 4" />
            <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
            <path d="m7 22-4-4 4-4" />
            <path d="M21 13v1a4 4 0 0 1-4 4H3" />
        </svg>
    )
}

function VolumeIcon({ level }: { level: "off" | "low" | "high" }) {
    if (level === "off") {
        return (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 5 6 9H2v6h4l5 4V5z" />
                <line x1="22" x2="16" y1="9" y2="15" />
                <line x1="16" x2="22" y1="9" y2="15" />
            </svg>
        )
    }
    if (level === "low") {
        return (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 5 6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
        )
    }
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H2v6h4l5 4V5z" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
    )
}

/** Always-on glass — scroll morph archived on cursor/scroll-elevate-archive-653c */
function useNavElevate() {
    return { elevate: 1, ready: true }
}

/**
 * Fixed embed chrome: collapsed pills only. Expanded player overflows visibly.
 * Always-on glass optic pill (scroll morph archived).
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 720
 * @framerIntrinsicHeight 56
 */
const css = `
.bn-shell {
  --pn-elevate: 1;
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
  transform: none;
}
.bn-root::-webkit-scrollbar { display: none; width: 0; height: 0; }
.bn, .bn-music { --ink: #212324; --muted: #6a6a6a; --ease: cubic-bezier(.32,.72,0,1); }
.bn {
  pointer-events: auto; position: relative;
  display: flex; align-items: center;
  gap: calc(.55rem - (var(--pn-elevate) * .2rem));
  box-sizing: border-box; height: 56px; min-height: 56px; max-height: 56px;
  flex: 0 1 auto; width: max-content;
  min-width: calc((1 - var(--pn-elevate)) * 560px);
  max-width: 560px;
  padding:
    0
    calc(.72rem - (var(--pn-elevate) * .34rem))
    0
    12px;
  color: var(--ink);
  background-color: rgba(250, 249, 246, calc(.52 * var(--pn-elevate)));
  background-image: linear-gradient(155deg, rgba(255,255,255,calc(.82 * var(--pn-elevate))) 0%, rgba(255,255,255,calc(.48 * var(--pn-elevate))) 55%, rgba(255,255,255,calc(.64 * var(--pn-elevate))) 100%);
  border: 1px solid rgba(0,0,0,calc(.08 * var(--pn-elevate)));
  border-radius: 999px;
  box-shadow: 0 1px 0 rgba(255,255,255,calc(.75 * var(--pn-elevate))) inset, 0 -1px 0 rgba(255,255,255,calc(.2 * var(--pn-elevate))) inset, 0 0 0 .5px rgba(0,0,0,calc(.04 * var(--pn-elevate))), 0 3px 10px rgba(0,0,0,calc(.05 * var(--pn-elevate)));
  backdrop-filter: blur(calc(var(--pn-elevate) * 64px)) saturate(calc(100% + (var(--pn-elevate) * 50%)));
  -webkit-backdrop-filter: blur(calc(var(--pn-elevate) * 64px)) saturate(calc(100% + (var(--pn-elevate) * 50%)));
  isolation: isolate; overflow: visible;
}
.bn-links {
  display: flex; align-items: center; gap: .12rem; margin-left: .15rem; min-width: 0;
  flex: calc(1 - var(--pn-elevate)) 1 auto; justify-content: center;
}
.bn-music {
  pointer-events: auto; position: relative; display: block;
  flex: 0 0 6.6rem; width: 6.6rem; min-width: 6.6rem; max-width: 6.6rem;
  height: 56px; overflow: visible;
}
.bn-music[data-expanded="true"] { z-index: 3; }
.bmp {
  position: absolute; top: 0; left: 0; z-index: 2;
  width: 6.6rem; box-sizing: border-box; height: 56px; min-height: 56px; max-height: 56px;
  display: flex; flex-direction: column; justify-content: center;
  color: #212324;
  background-color: rgba(250, 249, 246, calc(.52 * var(--pn-elevate)));
  background-image: linear-gradient(155deg, rgba(255,255,255,calc(.82 * var(--pn-elevate))) 0%, rgba(255,255,255,calc(.48 * var(--pn-elevate))) 55%, rgba(255,255,255,calc(.64 * var(--pn-elevate))) 100%);
  border: 1px solid rgba(0,0,0,calc(.08 * var(--pn-elevate)));
  border-radius: 999px; overflow: hidden;
  box-shadow: 0 1px 0 rgba(255,255,255,calc(.75 * var(--pn-elevate))) inset, 0 -1px 0 rgba(255,255,255,calc(.2 * var(--pn-elevate))) inset, 0 0 0 .5px rgba(0,0,0,calc(.04 * var(--pn-elevate))), 0 3px 10px rgba(0,0,0,calc(.05 * var(--pn-elevate)));
  backdrop-filter: blur(calc(var(--pn-elevate) * 64px)) saturate(calc(100% + (var(--pn-elevate) * 50%)));
  -webkit-backdrop-filter: blur(calc(var(--pn-elevate) * 64px)) saturate(calc(100% + (var(--pn-elevate) * 50%)));
  transform-origin: top left; isolation: isolate;
  transition: width .42s var(--ease), min-height .42s var(--ease), border-radius .42s var(--ease), box-shadow .42s ease, background .3s ease;
}
.bmp[data-embedded="true"][data-expanded="true"] {
  /* Match nav bar height; +56px wider than prior compact row. */
  position: absolute; top: 0; left: 0; z-index: 5;
  width: min(calc(15.5rem + 24px), calc(100vw - 2rem)); max-width: calc(15.5rem + 24px);
  height: 56px; min-height: 56px; max-height: 56px;
  border-radius: 1.15rem; overflow: hidden;
  background-color: rgba(250, 249, 246, .82);
  background-image: linear-gradient(160deg, rgba(255,255,255,.9) 0%, rgba(255,255,255,.72) 100%);
  border-color: rgba(0,0,0,.08);
  box-shadow: 0 1px 0 rgba(255,255,255,.78) inset, 0 -1px 0 rgba(255,255,255,.18) inset, 0 0 0 .5px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.06);
  backdrop-filter: blur(64px) saturate(150%);
  -webkit-backdrop-filter: blur(64px) saturate(150%);
}
.bmp[data-embedded="true"][data-expanded="true"] .bmp-expanded {
  display: block; height: 100%;
}
.bmp[data-embedded="true"][data-expanded="true"] .bmp-inner {
  display: flex; flex-direction: row; align-items: center; gap: .22rem;
  height: 100%; min-height: 56px; max-height: 56px;
  padding: 0 12px; overflow: hidden; box-sizing: border-box;
}
.bmp[data-embedded="true"][data-expanded="true"] .bmp-top {
  display: flex; align-items: center; gap: .38rem;
  flex: 1 1 auto; min-width: 0; margin: 0;
}
.bmp[data-embedded="true"][data-expanded="true"] .bmp-art {
  width: 1.9rem; height: 1.9rem; border-radius: .4rem; flex-shrink: 0;
}
.bmp[data-embedded="true"][data-expanded="true"] .bmp-meta {
  flex: 1 1 auto; min-width: 0; padding: 0;
}
.bmp[data-embedded="true"][data-expanded="true"] .bmp-title {
  font-size: 13px; line-height: 1.15;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.bmp[data-embedded="true"][data-expanded="true"] .bmp-artist {
  margin-top: .06rem; font-size: 11px; line-height: 1.15; color: #737373;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.bmp[data-embedded="true"][data-expanded="true"] .bmp-transport {
  display: flex; align-items: center; justify-content: flex-end; gap: 12px;
  margin: 0; padding: 0; flex: 0 0 auto;
}
.bmp[data-embedded="true"][data-expanded="true"] .bmp-ctrl,
.bmp[data-embedded="true"][data-expanded="true"] .bmp-play {
  box-sizing: border-box;
  width: 32px; height: 32px; min-width: 32px; min-height: 32px;
  max-width: 32px; max-height: 32px; padding: 0; flex: 0 0 32px;
}
.bmp[data-embedded="true"][data-expanded="true"] .bmp-ctrl svg,
.bmp[data-embedded="true"][data-expanded="true"] .bmp-play svg {
  width: 16px; height: 16px;
}
.bmp[data-embedded="true"][data-expanded="true"] .bmp-top { cursor: pointer; }
.bmp[data-embedded="true"][data-expanded="true"] .bmp-footer {
  display: none !important;
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
.bn-fx-nudge { padding-right: 16px; box-sizing: content-box; }
.bn-fx-nudge:hover .bn-icon-face, .bn-fx-nudge:focus-visible .bn-icon-face { animation: bn-fx-nudge .52s var(--ease) both; }
@keyframes bn-fx-nudge {
  0% { transform: translateY(0) scale(1); }
  28% { transform: translateY(5px) scale(.94); }
  58% { transform: translateY(-2px) scale(1.06); }
  100% { transform: translateY(1px) scale(1.04); }
}
.bn-avatar {
  position: relative; display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; flex-shrink: 0; border-radius: 50%; overflow: hidden;
  background: #e8e6e1; color: #fff; text-decoration: none;
  border: none; box-shadow: none; outline: none;
  transition: transform .28s var(--ease);
}
.bn-avatar-img { width:100%; height:100%; object-fit:cover; object-position:center center; display:block; image-rendering:auto; }
.bn-avatar-mark { font-size: .72rem; font-weight: 680; letter-spacing: .03em; }
.bn-avatar:hover {
  transform: scale(1.06);
  box-shadow: none;
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
.bmp[data-playing="true"] .bmp-disc { animation: bmp-spin 3.2s linear infinite; }

.bmp-collapsed {
  display: flex; align-items: center; gap: .35rem;
  height: 100%; min-height: 56px; padding: 0 .55rem; cursor: pointer; box-sizing: border-box;
}
.bmp[data-expanded="true"] .bmp-collapsed { display: none; }
.bmp[data-playing="true"]:not([data-expanded="true"]) { width: 8.1rem; }
.bmp-icon { width: 1.75rem; text-align: center; font-size: 14px; }
.bmp-icon-btn, .bmp-ctrl {
  border: 0; background: transparent; cursor: pointer; border-radius: 999px;
  width: 1.75rem; height: 1.75rem; display: inline-flex; align-items: center; justify-content: center;
  color: inherit; font-size: 11px;
}
.bmp-ctrl { width: 2.5rem; height: 2.5rem; font-size: 13px; }
.bmp-play { background: #111 !important; color: #fff !important; }
.bmp-ctrl[data-active="true"] { background: rgba(0,0,0,.06); }
.bmp-disc-shell {
  position: relative; display: block; width: 1.45rem; height: 1.45rem; flex-shrink: 0;
  border-radius: 999px; overflow: hidden;
  clip-path: circle(50% at 50% 50%); -webkit-clip-path: circle(50% at 50% 50%);
  -webkit-mask-image: radial-gradient(circle at center, #000 99%, transparent 100%);
  mask-image: radial-gradient(circle at center, #000 99%, transparent 100%);
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.14); background: #f0efec; isolation: isolate;
}
.bmp-disc {
  position: absolute; inset: 0; display: block; width: 100%; height: 100%;
  border-radius: 999px; overflow: hidden;
  clip-path: circle(50% at 50% 50%); -webkit-clip-path: circle(50% at 50% 50%);
  background: #f0efec; transform-origin: center center;
}
.bmp-collapsed-shuffle { color: #212324; }
.bmp-collapsed-shuffle:hover { background: rgba(0,0,0,.06); }
.bmp-disc::after {
  content: ""; position: absolute; inset: 50%; width: .28rem; height: .28rem;
  margin: -.14rem 0 0 -.14rem; border-radius: 999px; background: #fff;
  box-shadow: 0 0 0 1px rgba(0,0,0,.08); z-index: 1;
}
.bmp-disc img { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 999px; }
.bmp-disc-fallback {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  color: #a1a1a1; font-size: 10px; border-radius: 999px;
}
.bmp-collapsed-play { transition: box-shadow .3s ease; }
.bmp[data-playing="true"] .bmp-collapsed-play { animation: bmp-play-pulse 1.8s ease-in-out infinite; }
@keyframes bmp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes bmp-play-pulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(17,17,17,0); }
  50% { box-shadow: 0 0 0 3px rgba(17,17,17,.08); }
}
.bmp[data-expanded="true"][data-playing="true"] .bmp-art { border-radius: 50%; position: relative; }
.bmp[data-expanded="true"][data-playing="true"] .bmp-art img,
.bmp[data-expanded="true"][data-playing="true"] .bmp-art-fallback { animation: bmp-spin 3.2s linear infinite; }
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

    const title = track?.metadata?.title
        ? track.metadata.title
        : !player.ready
          ? "Loading playlist"
          : track?.metadataStatus === "loading"
            ? "Loading track"
            : "Untitled track"
    const artist = track?.metadata?.artist || ""
    const progressMax = player.duration > 0 ? player.duration : 0
    const progressValue = progressMax > 0 ? Math.min(player.currentTime, progressMax) : 0
    const elevated = elevate >= 0.5

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
                        <a
                            className="bn-icon-btn bn-fx-lift"
                            href={`mailto:${props.email}`}
                            aria-label={`Email ${props.email}`}
                        >
                            <StrokeIcon><MailIcon /></StrokeIcon>
                        </a>
                        <a
                            className="bn-icon-btn bn-fx-nudge"
                            href={props.resumeUrl}
                            download="Blake Schubert Product Designer Resume 2026.pdf"
                            aria-label="Download Blake Schubert Product Designer Resume 2026.pdf"
                        >
                            <StrokeIcon><FileDownIcon /></StrokeIcon>
                        </a>
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
                        <NoteIcon />
                    </span>
                    <span className="bmp-disc-shell" aria-hidden="true">
                        <span className="bmp-disc">
                            {track?.metadata?.artworkUrl ? (
                                <img src={track.metadata.artworkUrl} alt="" />
                            ) : (
                                <span className="bmp-disc-fallback"><NoteIcon /></span>
                            )}
                        </span>
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
                        {player.isPlaying ? <PauseBars /> : <PlayTriangle />}
                    </button>
                    {player.isPlaying ? (
                        <button
                            type="button"
                            className="bmp-icon-btn bmp-collapsed-shuffle"
                            aria-label="Reshuffle playlist"
                            title="Reshuffle"
                            onClick={(event) => {
                                event.stopPropagation()
                                actions.toggleShuffle(props.apiBaseUrl)
                            }}
                        >
                            <ShuffleIcon />
                        </button>
                    ) : null}
                </div>

                <div className="bmp-expanded">
                    <div className="bmp-inner">
                        <div
                            className="bmp-top"
                            role="button"
                            tabIndex={0}
                            aria-label="Collapse music player"
                            onClick={() => actions.setExpanded(false)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault()
                                    actions.setExpanded(false)
                                }
                            }}
                        >
                            <div className="bmp-art">
                                {track?.metadata?.artworkUrl ? (
                                    <img src={track.metadata.artworkUrl} alt="" />
                                ) : (
                                    <div className="bmp-art-fallback"><NoteIcon /></div>
                                )}
                            </div>
                            <div className="bmp-meta">
                                <span className="bmp-title">{title}</span>
                                {artist ? <span className="bmp-artist">{artist}</span> : null}
                            </div>
                        </div>

                        <div className="bmp-transport">
                            <button type="button" className="bmp-ctrl" aria-label="Reshuffle playlist" onClick={() => actions.toggleShuffle(props.apiBaseUrl)}>
                                <ShuffleIcon />
                            </button>
                            <button
                                type="button"
                                className="bmp-ctrl bmp-play"
                                disabled={!player.ready}
                                aria-label={player.isPlaying ? "Pause" : "Play"}
                                onClick={() => actions.togglePlay(props.apiBaseUrl)}
                            >
                                {player.isPlaying ? <PauseBars /> : <PlayTriangle />}
                            </button>
                        </div>
                    </div>
                </div>
            </aside>
                </div>
            </div>
        </div>
    )
}

/** Live Netlify host — playlist/preview API + public avatar/resume assets. */
const NETLIFY_ORIGIN = "https://genuine-cheesecake-75fecc.netlify.app"

BlakeNavBar.defaultProps = {
    apiBaseUrl: NETLIFY_ORIGIN,
    playlistUrl: "https://open.spotify.com/playlist/5zXp8gIyEeJteiSZj1RTqJ?si=xgbBBcvlRsmrIeklFdc-7A",
    playlistName: "Blake's Playlist",
    surpriseAfter: 4,
    surpriseTrackUrl: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
    variant: "Closed",
    homeUrl: "https://blakeschubert.com/",
    aboutUrl: "https://blakeschubert.com/about",
    workUrl: "https://blakeschubert.com/#all-campus",
    lookingUrl: "https://blakeschubert.com/#why-im-looking",
    linkedinUrl: "https://www.linkedin.com/in/blake-schubert/",
    email: "blakeschubertux@gmail.com",
    resumeUrl: `${NETLIFY_ORIGIN}/Blake_Schubert_Product_Designer_Resume_2026.pdf`,
    brandInitials: "BS",
    logoUrl: `${NETLIFY_ORIGIN}/avatar.png`,
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
        defaultValue: "https://genuine-cheesecake-75fecc.netlify.app",
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
        defaultValue: "blakeschubertux@gmail.com",
    },
    resumeUrl: {
        type: ControlType.String,
        title: "Resume URL",
        defaultValue:
            "https://genuine-cheesecake-75fecc.netlify.app/Blake_Schubert_Product_Designer_Resume_2026.pdf",
    },
    brandInitials: {
        type: ControlType.String,
        title: "Avatar initials",
        defaultValue: "BS",
    },
    logoUrl: {
        type: ControlType.String,
        title: "Logo URL",
        defaultValue: "https://genuine-cheesecake-75fecc.netlify.app/avatar.png",
    },
    playlistUrl: {
        type: ControlType.String,
        title: "Playlist URL",
        defaultValue: "https://open.spotify.com/playlist/5zXp8gIyEeJteiSZj1RTqJ?si=xgbBBcvlRsmrIeklFdc-7A",
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
