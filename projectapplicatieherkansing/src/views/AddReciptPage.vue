<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Add receipt</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Add receipt</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <ion-list :inset="true">
        <ion-list-header>
          <ion-label>Choose your group</ion-label>
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
            <p>Join a group before adding a transaction.</p>
          </ion-label>
        </ion-item>

        <ion-item
          v-for="group in groups"
          :key="group.id"
          button
          :detail="true"
          @click="openModal(group)"
        >
          <ion-label>
            {{ group.name }}
            <p>{{ group.role }} - {{ group.memberCount }} members</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <!-- Modal: nieuwe transactie voor de gekozen groep -->
      <ion-modal :is-open="isModalOpen" @didDismiss="closeModal">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ selectedGroup?.name }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeModal">Cancel</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <form @submit.prevent="saveTransaction">
            <ion-list>

              <ion-item>
                <ion-input
                  label="Amount (EUR)*"
                  label-placement="stacked"
                  type="number"
                  inputmode="decimal"
                  step="0.01"
                  min="0"
                  v-model="amount"
                  placeholder="12.50"
                ></ion-input>
              </ion-item>

              <ion-item>
                <ion-input
                  label="Date*"
                  label-placement="stacked"
                  type="date"
                  v-model="date"
                ></ion-input>
              </ion-item>

              <ion-item>
                <ion-input
                  label="Description"
                  label-placement="stacked"
                  v-model="description"
                  placeholder="Groceries"
                ></ion-input>
              </ion-item>

              <ion-item>
                <ion-select
                  label="Category"
                  label-placement="stacked"
                  v-model="categoryId"
                  interface="popover"
                  placeholder="No category"
                >
                  <ion-select-option :value="null">No category</ion-select-option>
                  <ion-select-option
                    v-for="category in expenseCategories"
                    :key="category.id"
                    :value="category.id"
                  >
                    {{ category.name }}
                  </ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item v-if="receiptImage">
                <ion-thumbnail slot="start">
                  <ion-img :src="receiptImage" alt="Receipt"></ion-img>
                </ion-thumbnail>
                <ion-label>Photo added</ion-label>
                <ion-button slot="end" fill="clear" color="danger" @click="removePhoto">
                  Remove
                </ion-button>
              </ion-item>
            </ion-list>

            <div class="ion-padding">
              <ion-button expand="block" fill="outline" @click="takePhoto">
                <ion-icon slot="start" :icon="cameraOutline"></ion-icon>
                Take photo
              </ion-button>

              <ion-button expand="block" fill="outline" @click="pickPhoto">
                <ion-icon slot="start" :icon="imagesOutline"></ion-icon>
                Choose from gallery
              </ion-button>

              <ion-button expand="block" type="submit" :disabled="isSaving">
                {{ isSaving ? 'Saving...' : 'Save transaction' }}
              </ion-button>
            </div>
          </form>
        </ion-content>
      </ion-modal>

      <ion-alert
        :is-open="errorMessage !== ''"
        :header="alertHeader"
        :message="errorMessage"
        :buttons="['OK']"
        @didDismiss="errorMessage = ''"
      ></ion-alert>

      <ion-toast
        :is-open="showSuccess"
        message="Transaction added."
        :duration="2000"
        @didDismiss="showSuccess = false"
      ></ion-toast>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, inject } from 'vue';
import {
  onIonViewWillEnter,
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonListHeader, IonItem, IonLabel, IonButton, IonButtons,
  IonInput, IonSelect, IonSelectOption, IonModal, IonThumbnail, IonImg, IonIcon,
  IonAlert, IonToast, IonRefresher, IonRefresherContent
} from '@ionic/vue';
import { cameraOutline, imagesOutline } from 'ionicons/icons';
import { useRouter } from 'vue-router';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { isPaymentCategory } from '@/categories';

const BASE_URL = import.meta.env.VITE_API_URL;
const axios = inject('axios');
const router = useRouter();

/* ---- Groepen ---- */
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

/* Categorieen zijn globaal in dit datamodel: GET /api/categories */
const categories = ref([]);

/* Een bon is altijd een uitgave, dus categorieen die bij een betaling horen
   (zoals 'inkomsten') horen hier niet in de keuzelijst. */
const expenseCategories = computed(() =>
  categories.value.filter((category) => !isPaymentCategory(category))
);

const loadCategories = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/categories`);
    categories.value = response.data;
  } catch (error) {
    console.error(error);
    // Geen blokkade: zonder categorieen kan je nog steeds een transactie opslaan.
  }
};

/* Ionic lifecycle (les 4, slide 7): draait elke keer dat je deze tab binnenkomt. */
onIonViewWillEnter(() => {
  loadGroups();
  if (categories.value.length === 0) loadCategories();
});

const handleRefresh = async (event) => {
  await loadGroups();
  event.target.complete();
};

/* ---- Modal + formulier ---- */
const isModalOpen = ref(false);
const selectedGroup = ref(null);

const amount = ref('');
const date = ref('');
const description = ref('');
const categoryId = ref(null);
const receiptImage = ref(null);

const isSaving = ref(false);
const errorMessage = ref('');
const alertHeader = ref('');
const showSuccess = ref(false);

const showError = (header, message) => {
  alertHeader.value = header;
  errorMessage.value = message;
};

const openModal = (group) => {
  selectedGroup.value = group;
  amount.value = '';
  date.value = new Date().toISOString().slice(0, 10); // vandaag als standaard
  description.value = '';
  categoryId.value = null;
  receiptImage.value = null;
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
  selectedGroup.value = null;
};

/* ---- Foto: camera of galerij (Capacitor plugin, zie les 5) ---- */
const getPhoto = async (source) => {
  try {
    const image = await Camera.getPhoto({
      quality: 60,
      width: 1024,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source
    });
    receiptImage.value = image.dataUrl;
  } catch (error) {
    // De gebruiker kan de camera annuleren: dat is geen fout.
    console.log('Photo cancelled or failed', error);
  }
};

const takePhoto = () => getPhoto(CameraSource.Camera);
const pickPhoto = () => getPhoto(CameraSource.Photos);
const removePhoto = () => { receiptImage.value = null; };

/* ---- Opslaan ---- */
const saveTransaction = async () => {
  if (!amount.value || !date.value) {
    showError('Missing fields', 'Please fill in amount and date.');
    return;
  }

  isSaving.value = true;

  try {
    await axios.post(
      `${BASE_URL}/api/households/${selectedGroup.value.id}/transactions`,
      {
        type: 'expense',
        amount: Number(amount.value),
        date: date.value,
        description: description.value.trim() || null,
        categoryId: categoryId.value,
        receiptImage: receiptImage.value
      }
    );

    const householdId = selectedGroup.value.id;
    closeModal();
    showSuccess.value = true;
    router.push(`/tabs/mygroup/${householdId}`);
  } catch (error) {
    console.error(error);
    // De API stuurt bij een 400 een { message, errors } mee.
    showError(
      'Could not save',
      error.response?.data?.message ?? 'Saving the transaction failed. Please try again.'
    );
  } finally {
    isSaving.value = false;
  }
};
</script>
