<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Profile</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-header collapse="condense" color="light">
        <ion-toolbar>
          <ion-title size="large">Profile</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-list v-if="user" :inset="true">
        <ion-item>
          <ion-input label="name" :value="user.name"></ion-input>
        </ion-item>
        <ion-item>
          <ion-input label="e-mail" :value="user.email"></ion-input>
        </ion-item>
        <ion-item>
          <ion-input label="role" :value="user.role" readonly="true"></ion-input>
        </ion-item>
      </ion-list>


      <ion-infinite-scroll @ionInfinite="ionInfinite">
        <ion-infinite-scroll-content></ion-infinite-scroll-content>
      </ion-infinite-scroll>

      <div class="ion-padding">
        <ion-button color="danger" expand="block" @click="logoutUser">Log out</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/vue';
import { useRouter } from 'vue-router';
import { arrowUpRightBoxOutline } from 'ionicons/icons';
import { user, logout } from '@/auth';

const router = useRouter();

const logoutUser = () => {
  logout();
  router.replace('/login');
};
</script>
