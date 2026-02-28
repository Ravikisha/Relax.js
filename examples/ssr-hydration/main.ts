import { mountClientHydrated, renderServerHTML } from './app'

const host = document.getElementById('host') as HTMLElement

// Simulate SSR output coming from the server.
host.innerHTML = renderServerHTML('0')

// Hydrate + wire reactivity.
mountClientHydrated(host)
