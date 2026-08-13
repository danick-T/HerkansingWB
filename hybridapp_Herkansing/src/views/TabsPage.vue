<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>

      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="concerten" href="/tabs/concerten">
          <ion-icon :icon="musicalNotes"></ion-icon>
          <ion-label>Concerten</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="bezoekers" href="/tabs/bezoekers">
          <ion-icon :icon="people"></ion-icon>
          <ion-label>Bezoekers</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="tickets" href="/tabs/tickets">
          <ion-icon :icon="ticket"></ion-icon>
          <ion-label>Tickets</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="about" href="/tabs/about">
          <ion-icon :icon="informationCircle"></ion-icon>
          <ion-label>About</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonRouterOutlet,
  IonIcon,
  IonLabel
} from '@ionic/vue';
import { musicalNotes, people, ticket, informationCircle } from 'ionicons/icons';
</script>
