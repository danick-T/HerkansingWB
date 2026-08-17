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
          <ion-input label="name" v-model="name" placeholder="Your name"></ion-input>
        </ion-item>
        <ion-item>
          <ion-button :disabled="isSavingName || name.trim() === user.name" @click="changeName">
            {{ isSavingName ? 'Saving...' : 'Change name' }}
          </ion-button>
        </ion-item>
        <ion-item>
          <ion-input label="e-mail" :value="user.email" readonly="true"></ion-input>
        </ion-item>
        <ion-item>
          <ion-input label="role" :value="user.role" readonly="true"></ion-input>
        </ion-item>
      </ion-list>

      <ion-list :inset="true">
        <ion-item>
          <ion-input type="password" label="new password" v-model="password"
                     placeholder="At least 8 characters"></ion-input>
        </ion-item>
        <ion-item>
          <ion-button :disabled="isSavingPassword" @click="changePassword">Change Password</ion-button>
        </ion-item>
      </ion-list>

      <ion-list :inset="true">
        <ion-card-header>
          <ion-card-title>Your Groups</ion-card-title>
          <ion-card-subtitle>Click on the arrow to see more information about your group</ion-card-subtitle>
        </ion-card-header>
        <ion-item v-if="isLoadingGroups">
          <ion-label>Loading your groups...</ion-label>
        </ion-item>

        <ion-item v-else-if="groupsError">
          <ion-label color="danger">{{ groupsError }}</ion-label>
        </ion-item>

        <ion-item v-else-if="groups.length === 0">
          <ion-label>No groups found</ion-label>
        </ion-item>

        <ion-item v-for="group in groups" :key="group.id">
          <ion-label>
            {{ group.name }}
            <p>{{ group.role }} - {{ group.memberCount }} members</p>
          </ion-label>
          <ion-button slot="end" fill="clear" @click="goToGroupInfo(group.id)">
            <ion-icon :icon="arrowForwardOutline" />
          </ion-button>
        </ion-item>
      </ion-list>

      <div class="ion-padding">
        <ion-button color="danger" expand="block" @click="logoutUser">Log out</ion-button>
      </div>

      <!-- Meldingen verdwijnen vanzelf na 3 seconden. -->
      <ion-toast
        :is-open="profileMessage !== ''"
        :message="profileMessage"
        :color="profileOk ? 'success' : 'danger'"
        :duration="3000"
        @didDismiss="profileMessage = ''"
      ></ion-toast>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, inject } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
         IonList, IonItem, IonInput, IonLabel, IonIcon, IonToast, onIonViewWillEnter } from '@ionic/vue';
import { useRouter } from 'vue-router';
import { arrowForwardOutline } from 'ionicons/icons';
import { user, logout, setUser } from '@/auth';

const BASE_URL = import.meta.env.VITE_API_URL;
const router = useRouter();
const axios = inject('axios');
const groups = ref([]);
const isLoadingGroups = ref(true);
const groupsError = ref('');


/* Eén gedeelde melding voor alle profielacties. */
const profileMessage = ref('');
const profileOk = ref(false);

const showMessage = (ok, message) => {
  profileOk.value = ok;
  profileMessage.value = message;
};

/* Naam wijzigen */
const name = ref('');
const isSavingName = ref(false);

const changeName = async () => {
  if (!user.value) return;

  const nieuweNaam = name.value.trim();
  if (nieuweNaam === '') {
    showMessage(false, 'Your name cannot be empty.');
    return;
  }

  isSavingName.value = true;
  try {
    /* PUT /api/users/:userId vraagt name en email allebei verplicht mee,
       ook al wijzigt het e-mailadres niet. */
    const response = await axios.put(`${BASE_URL}/api/users/${user.value.id}`, {
      name: nieuweNaam,
      email: user.value.email
    });

    // Bijwerken in auth.js, anders blijft overal de oude naam staan.
    setUser({ ...user.value, name: response.data.name });
    showMessage(true, 'Your name has been changed.');
  } catch (error) {
    console.error(error);
    showMessage(false, error.response?.data?.message ?? 'Could not change your name.');
  } finally {
    isSavingName.value = false;
  }
};

onIonViewWillEnter(async () => {
  profileMessage.value = '';
  name.value = user.value?.name ?? '';

  try {
    const response = await axios.get(`${BASE_URL}/api/households`);
    groups.value = response.data;
  } catch (error) {
    console.error(error);
    groupsError.value = 'Could not load your groups.';
  } finally {
    isLoadingGroups.value = false;
  }
});

const password = ref('');
const isSavingPassword = ref(false);

/* Er is geen apart wachtwoord-endpoint: het loopt via PUT /api/users/:userId.
   Die vraagt name en email verplicht mee, ook al wijzigen die niet - laat je
   ze weg, dan krijg je een 400 met 'Naam is verplicht'. */
const changePassword = async () => {
  if (!user.value) return;

  if (password.value.length < 8) {
    showMessage(false, 'Your password must be at least 8 characters long.');
    return;
  }

  isSavingPassword.value = true;
  try {
    await axios.put(`${BASE_URL}/api/users/${user.value.id}`, {
      name: user.value.name,
      email: user.value.email,
      password: password.value
    });
    password.value = '';
    showMessage(true, 'Your password has been changed.');
  } catch (error) {
    console.error(error);
    showMessage(false, error.response?.data?.message ?? 'Could not change your password.');
  } finally {
    isSavingPassword.value = false;
  }
};

const goToGroupInfo = (householdId) => {
  router.push(`/tabs/GroupInfo/${householdId}`);
};

const logoutUser = () => {
  logout();
  router.replace('/login');
};
</script>
