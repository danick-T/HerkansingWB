import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import ConcertenPage from '../views/ConcertenPage.vue';
import BezoekersPage from '../views/BezoekersPage.vue';
import TicketsPage from '../views/TicketsPage.vue';
import AboutPage from '../views/AboutPage.vue';
import TabsPage from '../views/TabsPage.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/tabs/concerten'
  },
  {
    path: '/tabs',
    component: TabsPage,
    children: [
      {
        path: '',
        redirect: '/tabs/concerten'
      },
      {
        path: 'concerten',
        name: 'Concerten',
        component: ConcertenPage
      },
      {
        path: 'bezoekers',
        name: 'Bezoekers',
        component: BezoekersPage
      },
      {
        path: 'tickets',
        name: 'Tickets',
        component: TicketsPage
      },
      {
        path: 'about',
        name: 'About',
        component: AboutPage
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
