import { spawn } from 'node:child_process'
import { once } from 'node:events'
import fs from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'

const rootDir = process.cwd()
const screenshotsDir = path.join(rootDir, 'screenshots')
let apiPort = 8010
let vitePort = 5176
let debugPort = 9333

const now = new Date().toISOString()
const company = {
  id: 1,
  owner_first_name: 'Demo',
  owner_last_name: 'Owner',
  name: 'Demo Bistro',
  slug: 'demo-bistro',
  venue_type: 'restaurant',
  avatar_url: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=400&q=80',
  status: 'trialing',
  menu_version: 7,
  trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  subscription_ends_at: null,
  wifi_name: 'Demo Bistro Guest',
  wifi_password: 'demo2026',
  working_hours: JSON.stringify({
    mon: { closed: false, open: '11:00', close: '22:00' },
    tue: { closed: false, open: '11:00', close: '22:00' },
    wed: { closed: false, open: '11:00', close: '22:00' },
    thu: { closed: false, open: '11:00', close: '22:00' },
    fri: { closed: false, open: '11:00', close: '23:00' },
    sat: { closed: false, open: '10:00', close: '23:00' },
    sun: { closed: false, open: '10:00', close: '21:00' },
  }),
  address: 'Kyiv, Khreshchatyk 1',
  maps_url: 'https://maps.google.com/?q=Kyiv%20Khreshchatyk%201',
  google_place_id: null,
  address_lat: '50.4501',
  address_lng: '30.5234',
  phone: '+380501112233',
  delivery_url: 'https://example.com/delivery',
  feedback_email: 'admin@digital-menu.local',
  telegram_chat_id: null,
}

const categories = [
  {
    id: 1,
    company_id: 1,
    name: 'Pizza',
    slug: 'pizza',
    sort_order: 10,
    created_at: now,
    updated_at: now,
    subcategories: [
      { id: 1, company_id: 1, category_id: 1, name: 'Classic', slug: 'classic', sort_order: 10 },
      { id: 2, company_id: 1, category_id: 1, name: 'Signature', slug: 'signature', sort_order: 20 },
    ],
    dishes: [
      {
        id: 1,
        company_id: 1,
        category_id: 1,
        subcategory_id: 1,
        name: 'Margherita',
        description: 'Tomato sauce, mozzarella, basil, olive oil',
        weight: '430 g',
        image_url: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=900&q=80',
        price: '245.00',
        is_available: true,
        likes_count: 19,
        sort_order: 10,
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        company_id: 1,
        category_id: 1,
        subcategory_id: 2,
        name: 'Diavola',
        description: 'Spicy salami, mozzarella, tomato sauce, chili oil',
        weight: '470 g',
        image_url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=900&q=80',
        price: '310.00',
        is_available: true,
        likes_count: 27,
        sort_order: 20,
        created_at: now,
        updated_at: now,
      },
    ],
  },
  {
    id: 2,
    company_id: 1,
    name: 'Drinks',
    slug: 'drinks',
    sort_order: 20,
    created_at: now,
    updated_at: now,
    subcategories: [
      { id: 3, company_id: 1, category_id: 2, name: 'Hot', slug: 'hot', sort_order: 10 },
      { id: 4, company_id: 1, category_id: 2, name: 'Cold', slug: 'cold', sort_order: 20 },
    ],
    dishes: [
      {
        id: 3,
        company_id: 1,
        category_id: 2,
        subcategory_id: 3,
        name: 'Espresso tonic',
        description: 'Double espresso, tonic water, citrus zest',
        weight: '250 ml',
        image_url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=900&q=80',
        price: '120.00',
        is_available: true,
        likes_count: 34,
        sort_order: 10,
        created_at: now,
        updated_at: now,
      },
    ],
  },
  {
    id: 3,
    company_id: 1,
    name: 'Desserts',
    slug: 'desserts',
    sort_order: 30,
    created_at: now,
    updated_at: now,
    subcategories: [
      { id: 5, company_id: 1, category_id: 3, name: 'Sweet', slug: 'sweet', sort_order: 10 },
    ],
    dishes: [
      {
        id: 4,
        company_id: 1,
        category_id: 3,
        subcategory_id: 5,
        name: 'Basque cheesecake',
        description: 'Cream cheese, vanilla, caramelized top',
        weight: '160 g',
        image_url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=900&q=80',
        price: '165.00',
        is_available: true,
        likes_count: 23,
        sort_order: 10,
        created_at: now,
        updated_at: now,
      },
    ],
  },
]

const allDishes = categories.flatMap((category) => category.dishes)
const publicMenu = {
  company,
  categories,
  popular: [...allDishes].sort((left, right) => right.likes_count - left.likes_count).slice(0, 4),
}

const ownerToken = 'screenshot-owner-token'
const ownerAdmin = { id: 1, name: 'Menu Admin', login: 'admin', role: 'owner' }
const platformCompany = {
  ...company,
  users_count: 1,
  dishes_count: allDishes.length,
  users: [
    {
      id: 1,
      company_id: 1,
      name: 'Menu Admin',
      email: 'admin@digital-menu.local',
      login: 'admin',
    },
  ],
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(payload))
}

function startApiServer() {
  const server = http.createServer((request, response) => {
    if (request.method === 'OPTIONS') {
      sendJson(response, 204, {})
      return
    }

    const url = new URL(request.url ?? '/', `http://127.0.0.1:${apiPort}`)
    const pathname = url.pathname

    if (pathname === '/api/auth/login' && request.method === 'POST') {
      sendJson(response, 200, { token: ownerToken, admin: ownerAdmin, company })
      return
    }

    if (pathname === '/api/company') {
      sendJson(response, 200, { data: company })
      return
    }

    if (pathname === '/api/dishes') {
      sendJson(response, 200, { data: categories })
      return
    }

    if (pathname === '/api/restaurants/demo-bistro/menu') {
      sendJson(response, 200, { data: publicMenu })
      return
    }

    if (pathname === '/api/restaurants/demo-bistro/menu/version') {
      sendJson(response, 200, { data: { version: company.menu_version } })
      return
    }

    if (pathname === '/api/platform/companies') {
      sendJson(response, 200, { data: [platformCompany] })
      return
    }

    sendJson(response, 404, { message: 'Screenshot fixture endpoint not found' })
  })

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(apiPort, '127.0.0.1', () => resolve(server))
  })
}

function getFreePort() {
  const server = http.createServer()

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close(() => resolve(port))
    })
  })
}

function spawnProcess(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: rootDir,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    ...options,
  })

  child.stdout?.on('data', (chunk) => process.stdout.write(chunk))
  child.stderr?.on('data', (chunk) => process.stderr.write(chunk))

  return child
}

function killProcessTree(child) {
  if (!child?.pid || child.killed) {
    return Promise.resolve()
  }

  if (process.platform !== 'win32') {
    child.kill('SIGTERM')
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    })
    killer.once('exit', () => resolve())
    killer.once('error', () => resolve())
  })
}

async function waitForUrl(url, timeoutMs = 30_000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)

      if (response.ok) {
        return response
      }
    } catch {
      await delay(250)
    }
  }

  throw new Error(`Timed out waiting for ${url}`)
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function startVite() {
  const npmArgs = [
    '--prefix',
    'frontend',
    'run',
    'dev',
    '--',
    '--host',
    '127.0.0.1',
    '--port',
    String(vitePort),
    '--strictPort',
  ]
  const command = process.platform === 'win32' ? process.env.ComSpec ?? 'cmd.exe' : 'npm'
  const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm', ...npmArgs] : npmArgs
  const child = spawnProcess(command, args, {
    env: {
      ...process.env,
      VITE_API_URL: `http://127.0.0.1:${apiPort}/api`,
    },
  })

  await waitForUrl(`http://127.0.0.1:${vitePort}/`, 45_000)
  return child
}

async function startChrome() {
  const chromePath = await findChrome()
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'digital-menu-screenshots-'))
  const child = spawnProcess(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    '--disable-crash-reporter',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ], {
    cwd: rootDir,
    env: process.env,
    stdio: 'ignore',
  })

  await waitForUrl(`http://127.0.0.1:${debugPort}/json/version`, 30_000)
  return { child, userDataDir }
}

async function findChrome() {
  const candidates = process.platform === 'win32'
    ? [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    ]
    : [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
    ]

  for (const candidate of candidates) {
    try {
      await fs.access(candidate)
      return candidate
    } catch {
      // Keep looking.
    }
  }

  throw new Error('Chrome or Edge was not found for screenshot capture.')
}

async function createCdpClient() {
  const response = await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, {
    method: 'PUT',
  })
  const target = await response.json()
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  await once(socket, 'open')

  let id = 0
  const callbacks = new Map()
  const eventListeners = new Map()

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)

    if (message.id && callbacks.has(message.id)) {
      const { resolve, reject } = callbacks.get(message.id)
      callbacks.delete(message.id)

      if (message.error) {
        reject(new Error(message.error.message))
      } else {
        resolve(message.result)
      }

      return
    }

    if (message.method && eventListeners.has(message.method)) {
      for (const listener of eventListeners.get(message.method)) {
        listener(message.params)
      }
    }
  })

  const client = {
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const nextId = ++id
        callbacks.set(nextId, { resolve, reject })
        socket.send(JSON.stringify({ id: nextId, method, params }))
      })
    },
    once(method) {
      return new Promise((resolve) => {
        const listener = (params) => {
          const listeners = eventListeners.get(method) ?? []
          eventListeners.set(method, listeners.filter((item) => item !== listener))
          resolve(params)
        }

        const listeners = eventListeners.get(method) ?? []
        eventListeners.set(method, [...listeners, listener])
      })
    },
    close() {
      socket.close()
    },
  }

  await client.send('Page.enable')
  await client.send('Runtime.enable')
  return client
}

async function navigateAndCapture(client, url, fileName, viewport, seedStorage = false) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
    mobile: viewport.mobile ?? false,
    screenWidth: viewport.width,
    screenHeight: viewport.height,
  })

  if (viewport.mobile) {
    await client.send('Emulation.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    })
  }

  if (seedStorage) {
    await navigate(client, `http://127.0.0.1:${vitePort}/`)
    await client.send('Runtime.evaluate', {
      expression: `
        localStorage.setItem('digital-menu-token', ${JSON.stringify(ownerToken)});
        localStorage.setItem('digital-menu-admin', ${JSON.stringify(JSON.stringify(ownerAdmin))});
        localStorage.setItem('digital-menu-company', ${JSON.stringify(JSON.stringify(company))});
      `,
    })
  }

  await navigate(client, url)
  await delay(2200)

  const result = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  })
  await fs.writeFile(path.join(screenshotsDir, fileName), Buffer.from(result.data, 'base64'))
}

async function navigate(client, url) {
  const loaded = client.once('Page.loadEventFired')
  await client.send('Page.navigate', { url })
  await loaded
}

async function main() {
  apiPort = await getFreePort()
  vitePort = await getFreePort()
  debugPort = await getFreePort()

  await fs.mkdir(screenshotsDir, { recursive: true })
  const apiServer = await startApiServer()
  const vite = await startVite()
  const chrome = await startChrome()
  const client = await createCdpClient()

  try {
    const baseUrl = `http://127.0.0.1:${vitePort}`

    await navigateAndCapture(client, `${baseUrl}/`, 'home-page.png', {
      width: 1440,
      height: 1050,
    })
    await navigateAndCapture(client, `${baseUrl}/admin`, 'admin-dashboard.png', {
      width: 1440,
      height: 1050,
    }, true)
    await navigateAndCapture(client, `${baseUrl}/r/demo-bistro`, 'mobile-view.png', {
      width: 390,
      height: 844,
      mobile: true,
      deviceScaleFactor: 2,
    })
  } finally {
    client.close()
    await Promise.allSettled([
      killProcessTree(chrome.child),
      killProcessTree(vite),
    ])
    apiServer.close()
    await delay(500)
    await fs.rm(chrome.userDataDir, { recursive: true, force: true }).catch(() => undefined)
  }

  console.log('Real application screenshots saved to screenshots/.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
