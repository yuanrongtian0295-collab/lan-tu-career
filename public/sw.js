const CACHE = 'lantu-v23-genuine-numbers'
const CORE = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/assets/prospect-9.png',
  '/assets/home-v4/player-model-jazz-11.png',
  '/assets/home-v4/home-mentor-sonics-35-v1.png',
  '/assets/home-v5/hud/metric-energy-graffiti-v2.png',
  '/assets/home-v5/hud/metric-morale-graffiti-v2.png',
  '/assets/home-v5/hud/metric-trust-graffiti-v2.png',
  '/assets/home-v5/hud/direction-graffiti-v2.png',
  '/assets/home-v5/hud/mentor-graffiti-v2.png',
  '/assets/glyphs/fonts/genuine-numbers-v1.ttf',
  '/assets/game-live-v6/scoreboard.png',
  '/assets/game-live-v6/player-portrait.png',
  '/assets/game-live-v6/event-card.png',
  '/assets/game-live-v6/clutch-card.png',
  '/assets/game-live-v6/control-dock.png',
  '/assets/game-live-v8/player-frame.png',
  '/assets/game-live-v8/stamina-frame.png',
  '/assets/game-live-v7/data-team.png',
  '/assets/game-live-v7/data-player.png',
  '/assets/game-live-v7/lineup-row.png',
  '/assets/game-live-v7/lineup-row-active.png',
  '/assets/game-live-v7/bench-panel.png',
  '/assets/game-live-v7/tactic-footer.png',
  '/assets/v3-pages/calendar/championship-trophy.png',
  '/assets/v3-pages/career-party/career-party-bg-v1.png',
  '/assets/v3-pages/career-party/whistle-pop-v1.png',
  '/assets/v3-pages/career-party/foam-finger-pop-v1.png',
  '/assets/v3-pages/career-party/record-trophy-panel-v4.png',
  '/assets/v3-pages/career-party/season-glyph-hou-v1.png',
  '/assets/v3-pages/playoff-party-v1/playoff-title-v1.png',
  '/assets/v3-pages/playoffs/bracket-title-paper.png',
  '/assets/v3-pages/playoffs/matchup-frame.png',
  '/assets/v3-pages/playoffs/current-series-frame.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))))
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone()
    caches.open(CACHE).then((cache) => cache.put(event.request, copy))
    return response
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('/'))))
})
