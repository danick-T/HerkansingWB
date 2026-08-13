<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Concerten</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="openConcertModal()">
            <ion-icon :icon="add"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Concerten</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div v-if="loading" class="ion-padding ion-text-center">
        <ion-spinner></ion-spinner>
        <p>Concerten worden geladen...</p>
      </div>

      <ion-alert
        :is-open="errorAlert"
        header="Er ging iets mis"
        :message="errorMessage"
        :buttons="['OK']"
        @didDismiss="errorAlert = false"
      ></ion-alert>

      <ion-list v-if="!loading && concerten.length > 0">
        <ion-item
          v-for="concert in concerten"
          :key="concert.id"
          button
          @click="openConcertModal(concert)"
        >
          <ion-label>
            <h2>{{ concert.artist }}</h2>
            <h3>{{ formatDatum(concert.date) }} om {{ formatTijd(concert.time) }}</h3>
            <p>{{ concert.venue }} &middot; {{ formatPrijs(concert.price) }} per ticket</p>
          </ion-label>

          <ion-button
            slot="end"
            fill="clear"
            color="danger"
            @click.stop="verwijderConcert(concert)"
          >
            <ion-icon :icon="trash"></ion-icon>
          </ion-button>
        </ion-item>
      </ion-list>

      <div v-if="!loading && concerten.length === 0" class="ion-padding">
        <p>Nog geen concerten. Klik op het + icoon om een concert toe te voegen!</p>
      </div>
    </ion-content>

    <ion-modal :is-open="isModalOpen" @didDismiss="closeModal">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ isEditing ? 'Concert Bewerken' : 'Nieuw Concert' }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="closeModal">Sluiten</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding">
        <ion-list>
          <ion-item>
            <ion-input
              label="Artiest *"
              label-placement="stacked"
              v-model="formData.artist"
              placeholder="Bijvoorbeeld: Stromae"
              :class="{ 'ion-invalid': errors.artist, 'ion-touched': errors.artist }"
              :error-text="errors.artist"
              @ionInput="wisFout('artist')"
            ></ion-input>
          </ion-item>

          <ion-item>
            <ion-input
              label="Datum *"
              label-placement="stacked"
              v-model="formData.date"
              type="date"
              :class="{ 'ion-invalid': errors.date, 'ion-touched': errors.date }"
              :error-text="errors.date"
              @ionInput="wisFout('date')"
            ></ion-input>
          </ion-item>

          <ion-item>
            <ion-input
              label="Aanvangsuur *"
              label-placement="stacked"
              v-model="formData.time"
              type="time"
              :class="{ 'ion-invalid': errors.time, 'ion-touched': errors.time }"
              :error-text="errors.time"
              @ionInput="wisFout('time')"
            ></ion-input>
          </ion-item>

          <ion-item>
            <ion-input
              label="Locatie *"
              label-placement="stacked"
              v-model="formData.venue"
              placeholder="Bijvoorbeeld: Sportpaleis Antwerpen"
              :class="{ 'ion-invalid': errors.venue, 'ion-touched': errors.venue }"
              :error-text="errors.venue"
              @ionInput="wisFout('venue')"
            ></ion-input>
          </ion-item>

          <ion-item>
            <ion-input
              label="Prijs per ticket (&euro;) *"
              label-placement="stacked"
              v-model="formData.price"
              type="number"
              min="0"
              step="0.01"
              placeholder="Bijvoorbeeld: 65.00"
              :class="{ 'ion-invalid': errors.price, 'ion-touched': errors.price }"
              :error-text="errors.price"
              @ionInput="wisFout('price')"
            ></ion-input>
          </ion-item>
        </ion-list>

        <ion-button
          expand="block"
          class="ion-margin-top"
          :disabled="saving"
          @click="saveConcert"
        >
          <ion-spinner v-if="saving" name="crescent"></ion-spinner>
          <span v-else>{{ isEditing ? 'Bewaren' : 'Toevoegen' }}</span>
        </ion-button>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonModal,
  IonSpinner,
  IonAlert,
  IonRefresher,
  IonRefresherContent,
  toastController,
  alertController
} from '@ionic/vue';
import { add, trash } from 'ionicons/icons';
import type { Concert } from '../types';
import { getConcerten, createConcert, updateConcert, deleteConcert } from '../services/api';

type ConcertForm = {
  artist: string;
  date: string;
  time: string;
  venue: string;
  price: string;
};

const legeForm = (): ConcertForm => ({
  artist: '',
  date: '',
  time: '',
  venue: '',
  price: ''
});

const concerten = ref<Concert[]>([]);
const loading = ref(true);
const saving = ref(false);
const isModalOpen = ref(false);
const isEditing = ref(false);
const currentConcert = ref<Concert | null>(null);
const formData = ref<ConcertForm>(legeForm());
const errors = ref<Partial<Record<keyof ConcertForm, string>>>({});
const errorAlert = ref(false);
const errorMessage = ref('');

onMounted(async () => {
  await loadConcerten();
});

async function loadConcerten() {
  loading.value = true;
  try {
    concerten.value = await getConcerten();
  } catch (error) {
    console.error('Fout bij laden concerten:', error);
    showError(foutBoodschap(error, 'Kon de concerten niet laden.'));
  } finally {
    loading.value = false;
  }
}

async function handleRefresh(event: CustomEvent) {
  await loadConcerten();
  (event.target as HTMLIonRefresherElement).complete();
}

function openConcertModal(concert?: Concert) {
  if (concert) {
    isEditing.value = true;
    currentConcert.value = concert;
    formData.value = {
      artist: concert.artist,
      date: concert.date,
      time: formatTijd(concert.time),
      venue: concert.venue,
      price: concert.price !== null && concert.price !== undefined ? String(concert.price) : ''
    };
  } else {
    isEditing.value = false;
    currentConcert.value = null;
    formData.value = legeForm();
  }
  errors.value = {};
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
  currentConcert.value = null;
  errors.value = {};
}

function wisFout(veld: keyof ConcertForm) {
  if (errors.value[veld]) {
    delete errors.value[veld];
  }
}

function validateForm(): boolean {
  errors.value = {};

  if (!formData.value.artist || formData.value.artist.trim() === '') {
    errors.value.artist = 'Artiest is verplicht';
  }

  if (!formData.value.date) {
    errors.value.date = 'Datum is verplicht';
  }

  if (!formData.value.time) {
    errors.value.time = 'Aanvangsuur is verplicht';
  }

  if (!formData.value.venue || formData.value.venue.trim() === '') {
    errors.value.venue = 'Locatie is verplicht';
  }

  const prijs = Number(formData.value.price);
  if (formData.value.price === '' || Number.isNaN(prijs)) {
    errors.value.price = 'Prijs is verplicht';
  } else if (prijs < 0) {
    errors.value.price = 'Prijs mag niet negatief zijn';
  }

  return Object.keys(errors.value).length === 0;
}

function bouwPayload(): Concert {
  return {
    artist: formData.value.artist.trim(),
    date: formData.value.date,
    time: formData.value.time.length === 5 ? `${formData.value.time}:00` : formData.value.time,
    venue: formData.value.venue.trim(),
    price: Number(formData.value.price)
  };
}

async function saveConcert() {
  if (!validateForm()) {
    return;
  }

  saving.value = true;
  try {
    if (isEditing.value && currentConcert.value?.id) {
      await updateConcert(currentConcert.value.id, bouwPayload());
      showToast('Concert succesvol bijgewerkt!');
    } else {
      await createConcert(bouwPayload());
      showToast('Concert succesvol toegevoegd!');
    }

    closeModal();
    await loadConcerten();
  } catch (error) {
    console.error('Fout bij opslaan concert:', error);
    showError(foutBoodschap(error, 'Kon het concert niet opslaan.'));
  } finally {
    saving.value = false;
  }
}

async function verwijderConcert(concert: Concert) {
  const alert = await alertController.create({
    header: 'Concert verwijderen?',
    message: `Wil je "${concert.artist}" definitief verwijderen?`,
    buttons: [
      { text: 'Annuleren', role: 'cancel' },
      {
        text: 'Verwijderen',
        role: 'destructive',
        handler: () => {
          void doeVerwijderen(concert.id!);
        }
      }
    ]
  });
  await alert.present();
}

async function doeVerwijderen(id: number) {
  try {
    await deleteConcert(id);
    showToast('Concert succesvol verwijderd!');
    await loadConcerten();
  } catch (error) {
    console.error('Fout bij verwijderen concert:', error);
    showError(foutBoodschap(error, 'Kon het concert niet verwijderen.'));
  }
}

function formatDatum(datum: string): string {
  if (!datum) {
    return 'Geen datum';
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(datum)
    ? new Date(`${datum}T00:00:00`)
    : new Date(datum);

  if (isNaN(date.getTime())) {
    return 'Ongeldige datum';
  }

  return date.toLocaleDateString('nl-BE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatTijd(tijd?: string): string {
  if (!tijd) {
    return '';
  }
  return tijd.slice(0, 5);
}

function formatPrijs(prijs?: number | string): string {
  const bedrag = Number(prijs);
  if (prijs === null || prijs === undefined || prijs === '' || Number.isNaN(bedrag)) {
    return 'prijs onbekend';
  }
  return `€ ${bedrag.toFixed(2)}`;
}

async function showToast(message: string) {
  const toast = await toastController.create({
    message: message,
    duration: 2000,
    position: 'bottom'
  });
  await toast.present();
}

function foutBoodschap(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return `${fallback} (${error.message})`;
  }
  return fallback;
}

function showError(message: string) {
  errorMessage.value = message;
  errorAlert.value = true;
}
</script>
