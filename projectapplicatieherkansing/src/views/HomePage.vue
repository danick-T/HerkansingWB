<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Home</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <ion-card>
        <ion-card-header>
          <ion-card-title>Hello {{ user?.name ?? 'there' }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          You are currently part of {{ groups.length }} group(s).
        </ion-card-content>
      </ion-card>

      <ion-card>
        <ion-card-header>
          <ion-card-title>Your recent activity</ion-card-title>
          <ion-card-subtitle>Your last {{ MAX_ACTIVITY }} movements</ion-card-subtitle>
        </ion-card-header>

        <ion-list :inset="false">
          <ion-item v-if="isLoadingActivity" lines="none">
            <ion-label>Loading activity...</ion-label>
          </ion-item>

          <ion-item v-else-if="recentActivity.length === 0" lines="none">
            <ion-label>
              Nothing yet
              <p>Add a receipt and it shows up here.</p>
            </ion-label>
          </ion-item>

          <ion-item
            v-for="activity in recentActivity"
            :key="activity.groupId + '-' + activity.id"
            button
            :detail="false"
            @click="goToGroupInfo(activity.groupId)"
          >
            <ion-icon
              slot="start"
              :icon="activity.type === 'income' ? cardOutline : receiptOutline"
              :color="activity.type === 'income' ? 'success' : 'medium'"
            ></ion-icon>

            <ion-label>
              {{ activity.description || (activity.type === 'income' ? 'Payment' : 'Expense') }}
              <p>{{ activity.groupName }} - {{ formatDate(activity.date) }}</p>
            </ion-label>

            <ion-text slot="end" :color="activity.type === 'income' ? 'success' : 'danger'">
              {{ activity.type === 'income' ? '+' : '-' }}{{ formatAmount(Number(activity.amount)) }}
            </ion-text>
          </ion-item>
        </ion-list>
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
  IonRefresher, IonRefresherContent, IonIcon, IonText
} from '@ionic/vue';
import { peopleOutline, receiptOutline, cardOutline } from 'ionicons/icons';
import { useRouter } from 'vue-router';
import { user } from '@/auth';

const BASE_URL = import.meta.env.VITE_API_URL;
const router = useRouter();
const axios = inject('axios');

const groups = ref([]);
const isLoadingGroups = ref(true);
const groupsError = ref('');

/* Recente activiteit: max 3 bewegingen van de ingelogde gebruiker. */
const MAX_ACTIVITY = 3;
const recentActivity = ref([]);
const isLoadingActivity = ref(true);

const formatAmount = (value) =>
  new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(value || 0);

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('nl-BE') : '');

/* Transacties hangen per groep, dus we vragen ze per groep op met het
   userId-filter dat de API aanbiedt, en houden daarna de nieuwste over. */
const loadActivity = async () => {
  isLoadingActivity.value = true;

  if (groups.value.length === 0 || !user.value?.id) {
    recentActivity.value = [];
    isLoadingActivity.value = false;
    return;
  }

  try {
    const responses = await Promise.all(
      groups.value.map((group) =>
        axios
          .get(`${BASE_URL}/api/households/${group.id}/transactions`, {
            params: { userId: user.value.id, limit: MAX_ACTIVITY }
          })
          .then((response) =>
            response.data.data.map((tx) => ({
              ...tx,
              groupId: group.id,
              groupName: group.name
            }))
          )
      )
    );

    recentActivity.value = responses
      .flat()
      .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id)
      .slice(0, MAX_ACTIVITY);
  } catch (error) {
    console.error(error);
    recentActivity.value = [];
  } finally {
    isLoadingActivity.value = false;
  }
};

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

  // Pas na de groepen: de activiteit wordt per groep opgehaald.
  await loadActivity();
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
