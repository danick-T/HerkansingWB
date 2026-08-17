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

      <!-- Iemand toevoegen: alleen voor de eigenaar van de groep -->
      <template v-if="isOwner">
        <ion-title size="large">Add member</ion-title>

        <ion-searchbar show-clear-button="always" placeholder="search user by email"
                       :debounce="400" @ionInput="handleSearch"></ion-searchbar>

        <ion-list :inset="true">
          <ion-item v-if="isSearching">
            <ion-label>Searching...</ion-label>
          </ion-item>

          <ion-item v-else-if="searchError">
            <ion-label color="danger">{{ searchError }}</ion-label>
          </ion-item>

          <ion-item v-else-if="searchQuery.length >= 2 && searchResults.length === 0">
            <ion-label>No users found</ion-label>
          </ion-item>

          <ion-item v-for="result in searchResults" :key="result.id">
            <ion-label>
              {{ result.email }}
              <p>{{ result.name }}</p>
            </ion-label>
            <ion-buttons slot="end">
              <ion-button fill="clear" @click="askAddMember(result)">
                <ion-icon :icon="personAddOutline" />
              </ion-button>
            </ion-buttons>
          </ion-item>
        </ion-list>
      </template>

      <ion-title size="large">Members</ion-title>

      <ion-item v-if="actionMessage" lines="none">
        <ion-label :color="actionOk ? 'success' : 'danger'">{{ actionMessage }}</ion-label>
      </ion-item>

      <ion-list :inset="true">
        <ion-item v-if="isLoadingMembers">
          <ion-label>Loading group members...</ion-label>
        </ion-item>

        <ion-item v-else-if="membersError">
          <ion-label color="danger">{{ membersError }}</ion-label>
        </ion-item>

        <ion-item v-for="membership in memberships" :key="membership.id">
          <ion-label>
            {{ membership.user.email }}
            <p>{{ membership.role }}</p>
          </ion-label>
          <!-- Enkel de eigenaar beheert leden, en niet zijn eigen rij -->
          <ion-buttons v-if="isOwner && membership.user.id !== user?.id" slot="end">
            <ion-button fill="clear" @click="askChangeRole(membership)">
              <ion-icon :icon="pencilOutline" />
            </ion-button>
            <ion-button fill="clear" color="danger" @click="askRemoveMember(membership)">
              <ion-icon :icon="trashOutline" />
            </ion-button>
          </ion-buttons>
        </ion-item>
      </ion-list>

      <!-- Eén alert voor alle drie de acties: welke actie er bij Yes hoort,
           zit in pendingAction. -->
      <ion-alert
        :is-open="isAlertOpen"
        :header="alertHeader"
        :message="alertMessage"
        :buttons="alertButtons"
        @didDismiss="isAlertOpen = false"
      ></ion-alert>

    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, inject } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
         IonButtons, IonBackButton, IonList, IonItem, IonInput, IonLabel,
         IonButton, IonIcon, IonSearchbar, IonAlert, onIonViewWillEnter } from '@ionic/vue';
import { useRoute } from 'vue-router';
import { trashOutline, pencilOutline, personAddOutline } from 'ionicons/icons';
import { user } from '@/auth';

const BASE_URL = import.meta.env.VITE_API_URL;
const axios = inject('axios');
const route = useRoute();
const householdId = route.params.householdId;

const household = ref(null);
const isLoading = ref(true);
const errorMessage = ref('');

// Eigen refs voor de leden: een mislukte ledencall mag de groepsgegevens
// niet verbergen.
const memberships = ref([]);
const isLoadingMembers = ref(true);
const membersError = ref('');

const searchQuery = ref('');
const searchResults = ref([]);
const isSearching = ref(false);
const searchError = ref('');

const actionMessage = ref('');
const actionOk = ref(false);

const isAlertOpen = ref(false);
const alertHeader = ref('');
const alertMessage = ref('');
const pendingAction = ref(null);

const isOwner = computed(() => household.value?.role === 'owner');

const alertButtons = [
  { text: 'Cancel', role: 'cancel' },
  { text: 'Yes', handler: () => pendingAction.value?.() }
];

const askConfirm = (header, message, action) => {
  alertHeader.value = header;
  alertMessage.value = message;
  pendingAction.value = action;
  isAlertOpen.value = true;
};

const showResult = (ok, message) => {
  actionOk.value = ok;
  actionMessage.value = message;
};

/* De groep uit het pad: /tabs/GroupInfo/:householdId */
const loadHousehold = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/households/${householdId}`);
    household.value = response.data;
  } catch (error) {
    console.error(error);
    errorMessage.value = error.response?.data?.message ?? 'Could not load this group.';
  } finally {
    isLoading.value = false;
  }
};

const loadMemberships = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/households/${householdId}/memberships`);
    memberships.value = response.data;
  } catch (error) {
    console.error(error);
    membersError.value = error.response?.data?.message ?? 'Could not load the members.';
  } finally {
    isLoadingMembers.value = false;
  }
};

/* Ionic lifecycle (les 4, slide 7): draait elke keer dat je deze pagina binnenkomt. */
onIonViewWillEnter(() => {
  loadHousehold();
  loadMemberships();
});

/* Na elke actie beide opnieuw laden: memberCount en je eigen rol kunnen mee
   veranderd zijn. */
const refresh = async () => {
  await Promise.all([loadHousehold(), loadMemberships()]);
};

const handleSearch = async (event) => {
  searchQuery.value = event.target.value ?? '';
  searchError.value = '';

  if (searchQuery.value.trim().length < 2) {
    searchResults.value = [];
    return;
  }

  isSearching.value = true;
  try {
    const response = await axios.get(`${BASE_URL}/api/users/search`, {
      params: { email: searchQuery.value.trim() }
    });
    // Wie al lid is eruit filteren, anders klik je op iemand en krijg je een
    // 409 die je zelf had kunnen zien aankomen.
    const alLid = memberships.value.map((membership) => membership.user.id);
    searchResults.value = response.data.filter((gevonden) => !alLid.includes(gevonden.id));
  } catch (error) {
    console.error(error);
    searchError.value = error.response?.data?.message ?? 'Could not search for users.';
  } finally {
    isSearching.value = false;
  }
};

/* PUT en DELETE hebben de membership-id nodig, niet de user-id. */
const changeRole = async (membership) => {
  const nieuweRol = membership.role === 'owner' ? 'member' : 'owner';

  try {
    await axios.put(
      `${BASE_URL}/api/households/${householdId}/memberships/${membership.id}`,
      { role: nieuweRol }
    );
    showResult(true, `${membership.user.email} is now ${nieuweRol}.`);
    await refresh();
  } catch (error) {
    console.error(error);
    showResult(false, error.response?.data?.message ?? 'Could not change the role.');
  }
};

const removeMember = async (membership) => {
  try {
    await axios.delete(
      `${BASE_URL}/api/households/${householdId}/memberships/${membership.id}`
    );
    showResult(true, `${membership.user.email} was removed from the group.`);
    await refresh();
  } catch (error) {
    console.error(error);
    showResult(false, error.response?.data?.message ?? 'Could not remove this member.');
  }
};

const addMember = async (gevonden) => {
  try {
    await axios.post(`${BASE_URL}/api/households/${householdId}/memberships`, {
      email: gevonden.email,
      role: 'member'
    });
    showResult(true, `${gevonden.email} was added to the group.`);
    searchQuery.value = '';
    searchResults.value = [];
    await refresh();
  } catch (error) {
    console.error(error);
    showResult(false, error.response?.data?.message ?? 'Could not add this member.');
  }
};

const askChangeRole = (membership) => {
  const nieuweRol = membership.role === 'owner' ? 'member' : 'owner';
  askConfirm(
    `Make ${nieuweRol}?`,
    `Change ${membership.user.email} to ${nieuweRol} in ${household.value.name}?`,
    () => changeRole(membership)
  );
};

const askRemoveMember = (membership) => {
  askConfirm(
    'Remove member?',
    `Remove ${membership.user.email} from ${household.value.name}?`,
    () => removeMember(membership)
  );
};

const askAddMember = (gevonden) => {
  askConfirm(
    'Add member?',
    `Add ${gevonden.email} to ${household.value.name}?`,
    () => addMember(gevonden)
  );
};
</script>
