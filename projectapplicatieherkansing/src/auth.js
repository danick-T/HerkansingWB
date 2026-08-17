import { ref } from 'vue'
import axios from 'axios'

const token = ref(null)
const user = ref(null)

// bij het laden van dit bestand: alles terughalen uit localStorage
const savedToken = localStorage.getItem('token')
const savedUser = localStorage.getItem('user')

if (savedToken) {
  token.value = savedToken
  axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`
}

if (savedUser) {
  user.value = JSON.parse(savedUser)
}

function login(newToken, newUser) {
  token.value = newToken
  user.value = newUser

  localStorage.setItem('token', newToken)
  localStorage.setItem('user', JSON.stringify(newUser))

  axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
}

/* Profielgegevens bijwerken zonder opnieuw in te loggen.
   De token blijft ongewijzigd: die verandert niet als je naam wijzigt. */
function setUser(newUser) {
  user.value = newUser
  localStorage.setItem('user', JSON.stringify(newUser))
}

function logout() {
  token.value = null
  user.value = null

  localStorage.removeItem('token')
  localStorage.removeItem('user')

  delete axios.defaults.headers.common['Authorization']
}

export { token, user, login, logout, setUser }
