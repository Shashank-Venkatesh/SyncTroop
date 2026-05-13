import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

async function testRoomCreation() {
  try {
    console.log('1. Signing up user...')
    const signupRes = await api.post('/auth/signup', {
      name: 'Test Creator',
      email: `test-${Date.now()}@example.com`,
      password: 'test123456',
    })
    console.log('✓ Signup successful')
    console.log('  User:', signupRes.data.user.name)
    console.log('  Token:', signupRes.data.token.substring(0, 20) + '...')

    // Get the cookie header from the response
    const setCookieHeader = signupRes.headers['set-cookie']?.[0]
    const tokenCookie = setCookieHeader ? setCookieHeader.split(';')[0] : null
    console.log('  Cookies:', tokenCookie ? 'Set' : 'Not set in response')

    console.log('\n2. Creating room...')
    if (!tokenCookie) {
      throw new Error('Auth cookie missing from signup response.')
    }

    const roomRes = await api.post('/room/create', {
      roomName: 'Test Room for Bug Check',
    }, {
      headers: {
        Cookie: tokenCookie,
      },
    })
    console.log('✓ Room created successfully')
    console.log('  Room Code:', roomRes.data.room.code)
    console.log('  Room Name:', roomRes.data.room.name)
    console.log('  Members:', roomRes.data.members.length)
    console.log('  Tasks:', roomRes.data.tasks.length)
    console.log('  Messages:', roomRes.data.messages.length)

    console.log('\n✓ ROOM CREATION TEST PASSED')
  } catch (error) {
    console.error('\n✗ ERROR:')
    if (error.response) {
      console.error('Status:', error.response.status)
      console.error('Data:', error.response.data)
    } else {
      console.error(error.message)
    }
    process.exit(1)
  }
}

testRoomCreation()
