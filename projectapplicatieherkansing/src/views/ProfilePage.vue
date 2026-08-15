<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Profile</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Profile</ion-title>
        </ion-toolbar>
      </ion-header>

      <ExploreContainer name="Tab 1 page" />

      <div class="ion-padding">
        <ion-label v-if="user">Ingelogd als {{ user.name ?? user.email }}</ion-label>
        <ion-button expand="block" @click="logoutUser">Log out</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonLabel } from '@ionic/vue';
import { useRouter } from 'vue-router';
import ExploreContainer from '@/components/ExploreContainer.vue';
import { user, logout } from '@/auth';

const router = useRouter();

const logoutUser = () => {
  logout();
  router.replace('/login');
};
</script>
