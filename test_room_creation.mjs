const testEmail = `test-${Date.now()}@example.com`

console.log('1. Signing up user...')
const signupRes = await fetch('http://localhost:3000/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Test Creator',
    email: testEmail,
    password: 'test123456',
  }),
})

const signupData = await signupRes.json()
if (!signupRes.ok) {
  console.error('✗ Signup failed:', signupData)
  process.exit(1)
}

// Extract the Set-Cookie header to get the token cookie
const setCookieHeader = signupRes.headers.get('set-cookie')
console.log('✓ Signup successful')
console.log('  User:', signupData.user.name)
console.log('  UserId:', signupData.user.id)
console.log('  Token returned:', signupData.token.substring(0, 20) + '...')
console.log('  Set-Cookie header:', setCookieHeader ? setCookieHeader.substring(0, 40) + '...' : 'None')

// Extract just the token value for the Cookie header
const tokenMatch = setCookieHeader?.match(/token=([^;]+)/)
const tokenCookie = tokenMatch ? tokenMatch[0] : null

console.log('\n2. Creating room (WITH AUTH COOKIE)...')
const roomRes = await fetch('http://localhost:3000/api/room/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(tokenCookie ? { 'Cookie': tokenCookie } : {}),
  },
  body: JSON.stringify({
    roomCode: 'TEST' + Math.random().toString(36).slice(2, 5).toUpperCase(),
    roomName: 'Test Room for Bug Check',
    user: signupData.user,
  }),
})

const roomData = await roomRes.json()
if (!roomRes.ok) {
  console.error('✗ Room creation failed:', roomRes.status, roomData)
  console.error('  Token cookie was:', tokenCookie ? 'sent' : 'NOT SENT')
  process.exit(1)
}

console.log('✓ Room created successfully')
console.log('  Room Code:', roomData.room.code)
console.log('  Room Name:', roomData.room.name)
console.log('  Creator ID:', roomData.room.creatorId)
console.log('  Members:', roomData.members.length)

console.log('\n✓✓✓ ROOM CREATION TEST PASSED ✓✓✓')
