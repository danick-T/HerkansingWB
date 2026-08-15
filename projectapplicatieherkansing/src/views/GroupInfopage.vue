<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/profile"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ household ? household.name : 'Group' }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">

      <ion-list :inset="true">
        <ion-item v-if="isLoading">
          <ion-label>Loading group...</ion-label>
        </ion-item>

        <ion-item v-else-if="errorMessage">
          <ion-label color="danger">{{ errorMessage }}</ion-label>
        </ion-item>

        <template v-else-if="household">
          <ion-item>
            <ion-input label="name" :value="household.name" readonly="true"></ion-input>
          </ion-item>
          <ion-item>
            <ion-input label="your role" :value="household.role" readonly="true"></ion-input>
          </ion-item>
          <ion-item>
            <ion-input label="members" :value="household.memberCount" readonly="true"></ion-input>
          </ion-item>
          <!-- inviteCode komt alleen mee als je owner bent -->
          <ion-item v-if="household.inviteCode">
            <ion-input label="invite code" :value="household.inviteCode" readonly="true"></ion-input>
          </ion-item>
        </template>
      </ion-list>

    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
         IonButtons, IonBackButton, IonList, IonItem, IonInput, IonLabel } from '@ionic/vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL;
const route = useRoute();

const household = ref(null);
const isLoading = ref(true);
const errorMessage = ref('');

/* De groep uit het pad: /tabs/GroupInfo/:householdId */
onMounted(async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/households/${route.params.householdId}`);
    household.value = response.data;
  } catch (error) {
    console.error(error);
    errorMessage.value = error.response?.data?.message ?? 'Could not load this group.';
  } finally {
    isLoading.value = false;
  }
});
</script>
