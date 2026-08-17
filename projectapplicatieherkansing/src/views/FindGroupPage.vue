<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Find a group</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Find a group</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <ion-card>
        <ion-card-header>
          <ion-card-title>Join a group</ion-card-title>
          <ion-card-subtitle>Ask the owner for the invitation code</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <form @submit.prevent="joinGroup">
            <ion-item>
              <ion-input
                label="Group code*"
                label-placement="stacked"
                v-model="groupCode"
                placeholder="Enter group code"
              ></ion-input>
            </ion-item>

            <div class="ion-padding-top">
              <ion-button expand="block" type="submit" :disabled="isJoining">
                {{ isJoining ? 'Joining...' : 'Join group' }}
              </ion-button>
            </div>
          </form>
        </ion-card-content>
      </ion-card>

      <ion-list :inset="true">
        <ion-list-header>
          <ion-label>Current groups</ion-label>
        </ion-list-header>

        <ion-item v-if="isLoadingGroups">
          <ion-label>Loading your groups...</ion-label>
        </ion-item>

        <ion-item v-else-if="groupsError">
          <ion-label color="danger">{{ groupsError }}</ion-label>
        </ion-item>

        <ion-item v-else-if="groups.length === 0">
          <ion-label>No groups yet</ion-label>
        </ion-item>

        <ion-item
          v-for="group in groups"
          :key="group.id"
          button
          :detail="false"
          @click="goToGroup(group.id)"
        >
          <ion-icon slot="start" :icon="peopleOutline"></ion-icon>
          <ion-label>
            {{ group.name }}
            <p>{{ group.role }} - {{ group.memberCount }} members</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <ion-alert
        :is-open="errorMessage !== ''"
        :header="alertHeader"
        :message="errorMessage"
        :buttons="['OK']"
        @didDismiss="errorMessage = ''"
      ></ion-alert>

      <ion-toast
        :is-open="showSuccess"
        message="You joined the group."
        :duration="2000"
        @didDismiss="showSuccess = false"
      ></ion-toast>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, inject } from 'vue';
import {
  onIonViewWillEnter,
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonList, IonListHeader, IonItem, IonLabel, IonInput, IonButton, IonIcon,
  IonAlert, IonToast, IonRefresher, IonRefresherContent
} from '@ionic/vue';
import { peopleOutline } from 'ionicons/icons';
import { useRouter } from 'vue-router';

const BASE_URL = import.meta.env.VITE_API_URL;
const axios = inject('axios');
const router = useRouter();

const groups = ref([]);
const isLoadingGroups = ref(true);
const groupsError = ref('');

const groupCode = ref('');
const isJoining = ref(false);
const errorMessage = ref('');
const alertHeader = ref('');
const showSuccess = ref(false);

const showError = (header, message) => {
  alertHeader.value = header;
  errorMessage.value = message;
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
};

/* Ionic lifecycle (les 4, slide 7): draait elke keer dat je deze tab binnenkomt. */
onIonViewWillEnter(loadGroups);

const handleRefresh = async (event) => {
  await loadGroups();
  event.target.complete();
};

const joinGroup = async () => {
  if (!groupCode.value.trim()) {
    showError('Missing code', 'Please enter a group code.');
    return;
  }

  isJoining.value = true;

  try {
    const response = await axios.post(`${BASE_URL}/api/households/join`, {
      code: groupCode.value.trim()
    });

    groupCode.value = '';
    showSuccess.value = true;
    await loadGroups();

    // Meteen doorsturen naar de groep waar je net lid van werd.
    const joinedId = response.data?.id ?? response.data?.householdId;
    if (joinedId) {
      router.push(`/tabs/mygroup/${joinedId}`);
    }
  } catch (error) {
    console.error(error);
    showError(
      'Could not join',
      error.response?.data?.message ?? 'Joining the group failed. Check the code and try again.'
    );
  } finally {
    isJoining.value = false;
  }
};

const goToGroup = (householdId) => {
  router.push(`/tabs/mygroup/${householdId}`);
};
</script>
