import { createApp } from 'vue'
import App from './App.vue'
import router from './router';
import { token, logout } from './auth';
import axios from 'axios';
import VueAxios from 'vue-axios';


import { IonicVue } from '@ionic/vue';

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* @import '@ionic/vue/css/palettes/dark.always.css'; */
/* @import '@ionic/vue/css/palettes/dark.class.css'; */
import '@ionic/vue/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';

const app = createApp(App)
  .use(IonicVue)
  .use(router)
  .use(VueAxios, axios);

app.provide('axios', app.config.globalProperties.axios);

/* Token verlopen (12u) of ongeldig -> uitloggen en terug naar login.
   Alleen als we dachten ingelogd te zijn: een 401 op de login-call zelf
   betekent gewoon 'verkeerd wachtwoord'. */
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && token.value !== null) {
      logout();
      router.replace('/login');
    }
    return Promise.reject(error);
  }
);

router.isReady().then(() => {
  app.mount('#app');
});
