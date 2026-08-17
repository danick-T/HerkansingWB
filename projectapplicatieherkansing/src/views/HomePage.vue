<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Home</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Hello {{ user?.username ?? 'there' }}</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <ion-card>
        <ion-card-header>
          <ion-card-subtitle>Your groups</ion-card-subtitle>
          <ion-card-title>{{ groups.length }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          You are currently part of {{ groups.length }} group(s).
        </ion-card-content>
      </ion-card>

      <div class="ion-padding">
        <ion-button expand="block" @click="goToAddReceipt">Add receipt</ion-button>
      </div>

      <ion-list :inset="true">
        <ion-list-header>
          <ion-label>Your groups</ion-label>
        </ion-list-header>

        <ion-item v-if="isLoadingGroups">
          <ion-label>Loading your groups...</ion-label>
        </ion-item>

        <ion-item v-else-if="groupsError">
          <ion-label color="danger">{{ groupsError }}</ion-label>
        </ion-item>

        <ion-item v-else-if="groups.length === 0">
          <ion-label>
            No groups yet
            <p>Join a group to start sharing receipts.</p>
          </ion-label>
        </ion-item>

        <ion-item
          v-for="group in groups"
          :key="group.id"
          button
          :detail="false"
          @click="goToGroupInfo(group.id)"
        >
          <ion-icon slot="start" :icon="peopleOutline"></ion-icon>
          <ion-label>
            {{ group.name }}
            <p>{{ group.role }} - {{ group.memberCount }} members</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <div v-if="!isLoadingGroups && groups.length === 0" class="ion-padding">
        <ion-button expand="block" fill="outline" @click="goToFindGroup">Find a group</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, inject } from 'vue';
import {
  onIonViewWillEnter,
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonButton, IonList, IonListHeader, IonItem, IonLabel,
  IonRefresher, IonRefresherContent, IonIcon
} from '@ionic/vue';
import { peopleOutline } from 'ionicons/icons';
import { useRouter } from 'vue-router';
import { user } from '@/auth';

const BASE_URL = import.meta.env.VITE_API_URL;
const router = useRouter();
const axios = inject('axios');

const groups = ref([]);
const isLoadingGroups = ref(true);
const groupsError = ref('');

const loadGroups = async () => {
  isLoadingGroups.value = true;
  groupsError.value = '';

  try {
    const response = await axios.get(`${BASE_URL}/api/households`);
    groups.value = response.data;
  } catch (error) {
    console.error(error);
    groupsError.value = 'Could not load your groups.';
  } finally {
    isLoadingGroups.value = false;
  }
};

/* Ionic lifecycle (les 4, slide 7): draait elke keer dat je deze tab binnenkomt,
   in tegenstelling tot onMounted dat maar een keer draait. */
onIonViewWillEnter(loadGroups);

const handleRefresh = async (event) => {
  await loadGroups();
  event.target.complete();
};

const goToGroupInfo = (householdId) => {
  router.push(`/tabs/mygroup/${householdId}`);
};

const goToAddReceipt = () => {
  router.push('/tabs/addrecipt');
};

const goToFindGroup = () => {
  router.push('/tabs/findgroup');
};
</script>
