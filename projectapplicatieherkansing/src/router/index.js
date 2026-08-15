import { createRouter, createWebHistory } from '@ionic/vue-router';
import TabsPage from '../views/TabsPage.vue'
import { token } from '@/auth';

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
    {
    path: '/login',
    component: () => import('@/views/LoginPage.vue')
  },
    {
    path: '/register',
    component: () => import('@/views/RegisterPage.vue')
  },
  {
    path: '/tabs/',
    component: TabsPage,
    children: [
      {
        path: '',
        redirect: '/tabs/profile'
      },
      {
        path: 'profile',
        component: () => import('@/views/ProfilePage.vue')
      },
      {
        path: 'MyGroup',
        component: () => import('@/views/MyGroupsPage.vue')
      },
      {
        path: 'GroupInfo',
        component: () => import('@/views/GroupInfoPage.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

/* Slot op de app: zonder token kom je niet bij de tabs,
   en wie al ingelogd is hoeft login/register niet meer te zien. */
router.beforeEach((to) => {
  const ingelogd = token.value !== null;

  if (to.path.startsWith('/tabs') && !ingelogd) {
    return '/login';
  }

  if ((to.path === '/login' || to.path === '/register') && ingelogd) {
    return '/tabs/profile';
  }
});

export default router
