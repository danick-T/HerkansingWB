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

      <ion-title size="large">Welcome to your Profile</ion-title>

      <ion-list v-if="user" :inset="true">
        <ion-item>
          <ion-input label="name" :value="user.name"></ion-input>
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
        <ion-item v-if="passwordMessage">
          <ion-label :color="passwordOk ? 'success' : 'danger'">{{ passwordMessage }}</ion-label>
        </ion-item>
        <ion-item>
          <ion-button :disabled="isSavingPassword" @click="changePassword">Change Password</ion-button>
        </ion-item>
      </ion-list>

      <ion-Title size="large">Your Groups</ion-title>

      <ion-list :inset="true">
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
            <ion-icon :icon="arrowUpRightBoxOutline" />
          </ion-button>
        </ion-item>
      </ion-list>

      <div class="ion-padding">
        <ion-button color="danger" expand="block" @click="logoutUser">Log out</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
         IonList, IonItem, IonInput, IonLabel, IonIcon } from '@ionic/vue';
import { useRouter } from 'vue-router';
import { arrowUpRightBoxOutline } from 'ionicons/icons';
import axios from 'axios';
import { user, logout } from '@/auth';

const BASE_URL = import.meta.env.VITE_API_URL;
const router = useRouter();

const groups = ref([]);
const isLoadingGroups = ref(true);
const groupsError = ref('');


onMounted(async () => {
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
const passwordMessage = ref('');
const passwordOk = ref(false);
const isSavingPassword = ref(false);

/* Er is geen apart wachtwoord-endpoint: het loopt via PUT /api/users/:userId.
   Die vraagt name en email verplicht mee, ook al wijzigen die niet - laat je
   ze weg, dan krijg je een 400 met 'Naam is verplicht'. */
const changePassword = async () => {
  if (!user.value) return;

  if (password.value.length < 8) {
    passwordOk.value = false;
    passwordMessage.value = 'Your password must be at least 8 characters long.';
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
    passwordOk.value = true;
    passwordMessage.value = 'Your password has been changed.';
  } catch (error) {
    console.error(error);
    passwordOk.value = false;
    passwordMessage.value = error.response?.data?.message ?? 'Could not change your password.';
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
