import { mount } from '@vue/test-utils'
import AboutPage from '@/views/AboutPage.vue'
import { describe, expect, test } from 'vitest'

describe('AboutPage.vue', () => {
  test('toont de gegevens van de ontwikkelaar', () => {
    const wrapper = mount(AboutPage)
    expect(wrapper.text()).toMatch('Danick Tchang')
  })
})
