<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home" href="/tabs/home">
          <ion-icon :icon="homeOutline"></ion-icon>
          <ion-label>Home</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="addrecipt" href="/tabs/addrecipt">
          <ion-icon :icon="addOutline"></ion-icon>
          <ion-label>add recipt</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="findgroup" href="/tabs/findgroup">
          <ion-icon :icon="searchOutline"></ion-icon>
          <ion-label>find group</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="profile" href="/tabs/profile">
          <ion-icon :icon="personOutline"></ion-icon>
          <ion-label>profile</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup>

import { IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonPage, IonRouterOutlet } from '@ionic/vue';
import { personOutline, addOutline, homeOutline, searchOutline } from 'ionicons/icons';
</script>
