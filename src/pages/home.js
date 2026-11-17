// Entry for the home page (pages/index.html).
import '@src/styles/base.css'
import { mountIntro } from '@src/sections/intro/intro.js'
import { mountForYou } from '@src/sections/for-you/for-you.js'
import { mountAdopters } from '@src/sections/adopters/adopters.js'
import { mountGameTrigger } from '@src/sections/game/trigger.js'
import { mountWaits } from '@src/sections/waits/waits.js'
import { mountReady } from '@src/sections/ready/ready.js'
import { mountAdopt } from '@src/sections/adopt/adopt.js'
import { mountSaved } from '@src/sections/saved/saved.js'
import { mountDocsPrefetch } from '@src/lib/prefetch-docs.js'
import { mountContact } from '@src/sections/contact/contact.js'

// "Waiting saved with FCR" box in a top corner, shown from the first moment.
const savedEl = document.querySelector('[data-time-saved]')
if (savedEl) mountSaved(savedEl)
const intro = document.querySelector('[data-intro]')
if (intro) mountIntro(intro)
// The adopt section listens for the card's chain, so it mounts first.
const adoptEl = document.querySelector('[data-adopt]')
if (adoptEl) mountAdopt(adoptEl)
const forYou = document.querySelector('[data-for-you]')
if (forYou) mountForYou(forYou)
const adoptersEl = document.querySelector('[data-adopters]')
if (adoptersEl) mountAdopters(adoptersEl)
const waitsEl = document.querySelector('[data-waits]')
if (waitsEl) mountWaits(waitsEl)
const readyEl = document.querySelector('[data-ready]')
if (readyEl) mountReady(readyEl)
// The docs load from cache once the page is idle (and prerender on hover where supported).
mountContact()
mountDocsPrefetch()
// Easter egg: hold F, C and R together (or tap the FCR wordmark three times).
mountGameTrigger()
