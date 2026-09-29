/**
 * Blake Nav Bar — Framer Code Component
 *
 * Glass pills: [avatar · About · Work · Why I'm looking · LinkedIn · Email · Resume] + music pill 16px beside (expands right/down)
 *
 * Setup:
 * 1. Deploy this repo to Netlify
 * 2. In Framer → Assets → Code → New Component
 * 3. Paste this entire file
 * 4. Set API Base URL + link/contact props
 * 5. Place once in a site-wide overlay / template (desktop)
 */
import { addPropertyControls, ControlType } from "framer"
import {
    startTransition,
    useEffect,
    useState,
    useSyncExternalStore,
    type CSSProperties,
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
}

const STORAGE_KEY = "blake-framer-music-player"
const RESTART_THRESHOLD = 3
const RICKROLL_ID = "4cOdK2wGLETKBW3PvgPWqT"

/**
 * Temporary filler playlist with local audio on the Netlify host.
 * Flip to false when Blake sends the real Spotify playlist URL.
 */
const USE_FILLER_PLAYLIST = true
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
        if (nextIndex >= state.queue.length) {
            if (fromEnded) {
                audio?.pause()
                if (audio) audio.currentTime = 0
                setState({ isPlaying: false, currentTime: 0 })
                return
            }
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

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 100
 * @framerIntrinsicHeight 40
 */
function BlakeNavBar(props: Props) {
    const player = usePlayer()
    const trackIndex = player.queue[player.queueIndex] ?? 0
    const track = player.tracks[trackIndex]
    const [toast, setToast] = useState<string | null>(null)

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
        <div style={{ width: "100%", height: "100%", pointerEvents: "none" }}>
            <style>{css}</style>
            <div className="bn-root">
                <nav className="bn" aria-label="Blake Schubert primary">
                    <a
                        className="bn-avatar"
                        href={props.homeUrl}
                        aria-label="Home"
                        title="Home"
                    >
                        <span className="bn-avatar-mark">{props.brandInitials || "BS"}</span>
                    </a>
                    <div className="bn-links">
                        <a className="bn-link" href={props.aboutUrl}>
                            About
                        </a>
                        <a className="bn-link" href={props.workUrl}>
                            Work
                        </a>
                        <a className="bn-link" href={props.lookingUrl}>
                            Why I&apos;m looking
                        </a>
                    </div>
                    <span className="bn-divider" aria-hidden="true" />
                    <div className="bn-actions">
                        <a
                            className="bn-icon-btn"
                            href={props.linkedinUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Open LinkedIn profile"
                        >
                            in
                        </a>
                        <button
                            type="button"
                            className="bn-icon-btn"
                            aria-label={`Copy email ${props.email}`}
                            onClick={() => {
                                void copyEmail()
                            }}
                        >
                            @
                        </button>
                        <a
                            className="bn-icon-btn"
                            href={props.resumeUrl}
                            download
                            aria-label="Download resume"
                        >
                            CV
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
                </div>

                <div className="bmp-expanded">
                    <div className="bmp-inner">
                        <div className="bmp-top">
                            <div className="bmp-art">
                                {track?.metadata?.artworkUrl ? (
                                    <img src={track.metadata.artworkUrl} alt="" />
                                ) : (
                                    <div className="bmp-art-fallback">♪</div>
                                )}
                            </div>
                            <div className="bmp-meta">
                                <span className="bmp-title">{title}</span>
                                {artist ? <span className="bmp-artist">{artist}</span> : null}
                                <span className="bmp-playlist">
                                    {props.playlistName || "Blake's Playlist"}
                                </span>
                            </div>
                            <button
                                type="button"
                                className="bmp-icon-btn"
                                aria-label="Collapse"
                                onClick={() => actions.setExpanded(false)}
                            >
                                ⌃
                            </button>
                        </div>

                        <div className="bmp-transport">
                            <button type="button" className="bmp-ctrl" aria-label="Shuffle" data-active={player.shuffle} onClick={actions.toggleShuffle}>
                                ⇄
                            </button>
                            <button type="button" className="bmp-ctrl" aria-label="Previous" onClick={() => actions.previous(props.apiBaseUrl)}>
                                ⏮
                            </button>
                            <button
                                type="button"
                                className="bmp-ctrl bmp-play"
                                disabled={!player.ready}
                                aria-label={player.isPlaying ? "Pause" : "Play"}
                                onClick={() => actions.togglePlay(props.apiBaseUrl)}
                            >
                                {player.isPlaying ? "❚❚" : "▶"}
                            </button>
                            <button type="button" className="bmp-ctrl" aria-label="Next" onClick={() => actions.next(false, props.apiBaseUrl)}>
                                ⏭
                            </button>
                            <button type="button" className="bmp-ctrl" aria-label="Repeat" data-active={player.repeat} onClick={actions.toggleRepeat}>
                                ↻
                            </button>
                        </div>

                        <div className="bmp-progress">
                            <span className="bmp-time">{formatTime(player.currentTime)}</span>
                            <input
                                className="bmp-range"
                                type="range"
                                min={0}
                                max={progressMax || 0}
                                step={0.01}
                                value={progressValue}
                                disabled={!player.hasAudio || progressMax === 0}
                                style={rangeFill(progressMax > 0 ? progressValue / progressMax : 0)}
                                onChange={(event) => actions.seek(Number(event.currentTarget.value))}
                            />
                            <span className="bmp-time">{formatTime(player.duration)}</span>
                        </div>

                        <div className="bmp-footer">
                            <div className="bmp-volume">
                                <button
                                    type="button"
                                    className="bmp-icon-btn"
                                    aria-label={player.muted ? "Unmute" : "Mute"}
                                    onClick={actions.toggleMuted}
                                >
                                    {player.muted || player.volume === 0 ? "🔇" : "🔊"}
                                </button>
                                <input
                                    className="bmp-range bmp-vol"
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={player.muted ? 0 : player.volume}
                                    style={rangeFill(player.muted ? 0 : player.volume)}
                                    onChange={(event) =>
                                        actions.setVolume(Number(event.currentTarget.value))
                                    }
                                />
                            </div>
                            <span className="bmp-note">
                                {player.hasAudio ? "30s preview" : "Loading audio"}
                            </span>
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
    homeUrl: "/",
    aboutUrl: "/about",
    workUrl: "/work",
    lookingUrl: "/looking",
    linkedinUrl: "https://www.linkedin.com/in/",
    email: "hello@blakeschubert.com",
    resumeUrl: "https://blake-music-player.netlify.app/resume.pdf",
    brandInitials: "BS",
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
    homeUrl: { type: ControlType.String, title: "Home URL", defaultValue: "/" },
    aboutUrl: { type: ControlType.String, title: "About URL", defaultValue: "/about" },
    workUrl: { type: ControlType.String, title: "Work URL", defaultValue: "/work" },
    lookingUrl: {
        type: ControlType.String,
        title: "Looking URL",
        defaultValue: "/looking",
    },
    linkedinUrl: {
        type: ControlType.String,
        title: "LinkedIn URL",
        defaultValue: "https://www.linkedin.com/in/",
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

const css = `
.bn-root {
  position: fixed; inset: .95rem 1.1rem auto 1.1rem; z-index: 9999;
  display: flex; align-items: flex-start; justify-content: flex-start; gap: 16px;
  pointer-events: none;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
}
.bn, .bn-music { --ink: #0f0f0f; --muted: #6a6a6a; --ease: cubic-bezier(.32,.72,0,1); }
.bn {
  pointer-events: auto; position: relative;
  display: flex; align-items: center; gap: .35rem;
  min-height: 3.4rem; padding: .32rem .38rem .32rem .32rem;
  color: var(--ink);
  background: rgba(255,255,255,.58);
  border: 1px solid rgba(255,255,255,.62);
  border-radius: 999px;
  box-shadow: 0 1px 0 rgba(255,255,255,.72) inset, 0 0 0 .5px rgba(0,0,0,.04), 0 10px 28px rgba(0,0,0,.07);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  flex-shrink: 0;
  max-width: min(38rem, calc(100vw - 10rem));
}
.bn-music { pointer-events: auto; display: flex; justify-content: flex-start; flex-shrink: 0; }
.bn-links { display: flex; align-items: center; gap: .12rem; margin-left: .15rem; }
.bn-link, .bn-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 2.45rem; padding: 0 .95rem; border: 0; border-radius: 999px;
  background: transparent; color: var(--muted); font: inherit; font-size: .875rem;
  font-weight: 560; letter-spacing: -.015em; text-decoration: none; cursor: pointer;
  transition: background .22s ease, color .22s ease, box-shadow .22s ease;
}
.bn-link:hover, .bn-icon-btn:hover { background: rgba(0,0,0,.045); color: var(--ink); }
.bn-link[aria-current="page"], .bn-link[data-active="true"] {
  color: var(--ink); background: rgba(255,255,255,.72);
  box-shadow: 0 1px 0 rgba(255,255,255,.9) inset, 0 1px 3px rgba(0,0,0,.06);
}
.bn-icon-btn { width: 2.45rem; padding: 0; color: rgba(15,15,15,.55); font-size: .72rem; font-weight: 650; }
.bn-icon-btn:hover { color: var(--ink); background: rgba(0,0,0,.055); }
.bn-avatar {
  position: relative; display: inline-flex; align-items: center; justify-content: center;
  width: 2.7rem; height: 2.7rem; flex-shrink: 0; border-radius: 50%;
  background: linear-gradient(155deg, #2c2c2c 0%, #0d0d0d 72%);
  color: #fff; text-decoration: none;
  box-shadow: 0 0 0 1px rgba(255,255,255,.18) inset, 0 0 0 1.5px rgba(255,255,255,.55), 0 0 0 2.5px rgba(0,0,0,.04);
  transition: transform .28s var(--ease), box-shadow .28s ease;
}
.bn-avatar-mark { font-size: .72rem; font-weight: 680; letter-spacing: .03em; }
.bn-avatar:hover {
  transform: scale(1.06);
  box-shadow: 0 0 0 1px rgba(255,255,255,.28) inset, 0 0 0 1.5px rgba(255,255,255,.75), 0 0 0 3px rgba(0,0,0,.05), 0 8px 20px rgba(0,0,0,.16);
}
.bn-divider { width: 1px; height: 1.05rem; margin: 0 .35rem; background: rgba(0,0,0,.1); }
.bn-actions { display: flex; align-items: center; gap: .05rem; margin-right: .05rem; }
.bn-toast {
  position: absolute; top: calc(100% + .55rem); left: 50%; transform: translateX(-50%);
  padding: .45rem .75rem; border-radius: 999px; background: #141414; color: #fff;
  font-size: .75rem; font-weight: 550; opacity: 0; pointer-events: none;
}
.bn-toast[data-open="true"] { opacity: 1; }
.bmp {
  position: relative;
  z-index: 2;
  width: 7.9rem;
  min-height: 3.4rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: #0f0f0f;
  background: rgba(255,255,255,.58);
  border: 1px solid rgba(255,255,255,.62);
  border-radius: 999px;
  overflow: hidden;
  box-shadow: 0 1px 0 rgba(255,255,255,.72) inset, 0 0 0 .5px rgba(0,0,0,.04), 0 10px 28px rgba(0,0,0,.07);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  transform-origin: top left;
  transition:
    width .42s var(--ease),
    min-height .42s var(--ease),
    border-radius .42s var(--ease),
    box-shadow .42s ease,
    background .3s ease;
}
.bmp[data-embedded="true"][data-expanded="true"] {
  width: min(21.25rem, calc(100vw - 2rem));
  border-radius: 1.3rem;
  background: rgba(255,255,255,.78);
  box-shadow: 0 1px 0 rgba(255,255,255,.75) inset, 0 0 0 .5px rgba(0,0,0,.04), 0 18px 44px rgba(0,0,0,.11);
}
.bmp[data-playing="true"] .bmp-disc {
  animation: bmp-disc-live 1.8s ease-out infinite;
}
@keyframes bmp-disc-live {
  0% { box-shadow: inset 0 0 0 1px rgba(0,0,0,.06), 0 0 0 0 rgba(15,15,15,.16); }
  70% { box-shadow: inset 0 0 0 1px rgba(0,0,0,.06), 0 0 0 6px rgba(15,15,15,0); }
  100% { box-shadow: inset 0 0 0 1px rgba(0,0,0,.06), 0 0 0 0 rgba(15,15,15,0); }
}
.bmp-collapsed {
  display: flex;
  align-items: center;
  gap: .35rem;
  height: 2.5rem;
  padding: 0 .3rem 0 .55rem;
  cursor: pointer;
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
.bmp[data-expanded="true"][data-playing="true"] .bmp-art {
  border-radius: 50%; position: relative;
}
.bmp[data-expanded="true"][data-playing="true"] .bmp-art img,
.bmp[data-expanded="true"][data-playing="true"] .bmp-art-fallback {
  animation: bmp-spin 2.8s linear infinite;
}
.bmp-art::after {
  content: ""; position: absolute; inset: 50%; width: .45rem; height: .45rem;
  margin: -.225rem 0 0 -.225rem; border-radius: 50%; background: #fff;
  box-shadow: 0 0 0 1px rgba(0,0,0,.08); opacity: 0; z-index: 1; pointer-events: none;
}
.bmp[data-expanded="true"][data-playing="true"] .bmp-art::after { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .bn-avatar, .bn-link, .bn-icon-btn, .bmp {
    transition: none !important;
  }
  .bn-avatar:hover { transform: none; }
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
  .bn { background: #f7f6f3; border-color: rgba(0,0,0,.08); }
}
@media (prefers-reduced-transparency: reduce) {
  .bn { background: #f4f3ef; backdrop-filter: none; -webkit-backdrop-filter: none; }
}
@media (prefers-reduced-motion: reduce) {
  .bn { transition: none !important; }
}
`
