<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Bezoekers</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="openBezoekerModal()">
            <ion-icon :icon="add"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Bezoekers</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div v-if="loading" class="ion-padding ion-text-center">
        <ion-spinner></ion-spinner>
        <p>Bezoekers worden geladen...</p>
      </div>

      <ion-alert
        :is-open="errorAlert"
        header="Er ging iets mis"
        :message="errorMessage"
        :buttons="['OK']"
        @didDismiss="errorAlert = false"
      ></ion-alert>

      <ion-list v-if="!loading && bezoekers.length > 0">
        <ion-item
          v-for="bezoeker in bezoekers"
          :key="bezoeker.id"
          button
          @click="openBezoekerModal(bezoeker)"
        >
          <ion-label>
            <h2>{{ bezoeker.first_name }} {{ bezoeker.last_name }}</h2>
            <h3>{{ bezoeker.email }}</h3>
            <p>Geboren op {{ formatDatum(bezoeker.birth_date) }}</p>
          </ion-label>

          <ion-button
            slot="end"
            fill="clear"
            color="primary"
            @click.stop="openTicketModal(bezoeker)"
          >
            <ion-icon :icon="ticket"></ion-icon>
          </ion-button>

          <ion-button
            slot="end"
            fill="clear"
            color="danger"
            @click.stop="verwijderBezoeker(bezoeker)"
          >
            <ion-icon :icon="trash"></ion-icon>
          </ion-button>
        </ion-item>
      </ion-list>

      <div v-if="!loading && bezoekers.length === 0" class="ion-padding">
        <p>Nog geen bezoekers. Klik op het + icoon om een bezoeker toe te voegen!</p>
      </div>
    </ion-content>

    <ion-modal :is-open="isBezoekerModalOpen" @didDismiss="closeBezoekerModal">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ isEditing ? 'Bezoeker Bewerken' : 'Nieuwe Bezoeker' }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="closeBezoekerModal">Sluiten</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding">
        <ion-list>
          <ion-item>
            <ion-input
              label="Voornaam *"
              label-placement="stacked"
              v-model="bezoekerFormData.first_name"
              placeholder="Bijvoorbeeld: Jan"
              :class="{ 'ion-invalid': errors.first_name, 'ion-touched': errors.first_name }"
              :error-text="errors.first_name"
              @ionInput="wisFout('first_name')"
            ></ion-input>
          </ion-item>

          <ion-item>
            <ion-input
              label="Achternaam *"
              label-placement="stacked"
              v-model="bezoekerFormData.last_name"
              placeholder="Bijvoorbeeld: Janssens"
              :class="{ 'ion-invalid': errors.last_name, 'ion-touched': errors.last_name }"
              :error-text="errors.last_name"
              @ionInput="wisFout('last_name')"
            ></ion-input>
          </ion-item>

          <ion-item>
            <ion-input
              label="Geboortedatum *"
              label-placement="stacked"
              v-model="bezoekerFormData.birth_date"
              type="date"
              :class="{ 'ion-invalid': errors.birth_date, 'ion-touched': errors.birth_date }"
              :error-text="errors.birth_date"
              @ionInput="wisFout('birth_date')"
            ></ion-input>
          </ion-item>

          <ion-item>
            <ion-input
              label="E-mail *"
              label-placement="stacked"
              v-model="bezoekerFormData.email"
              type="email"
              placeholder="Bijvoorbeeld: jan@voorbeeld.be"
              :class="{ 'ion-invalid': errors.email, 'ion-touched': errors.email }"
              :error-text="errors.email"
              @ionInput="wisFout('email')"
            ></ion-input>
          </ion-item>
        </ion-list>

        <ion-button
          expand="block"
          class="ion-margin-top"
          :disabled="saving"
          @click="saveBezoeker"
        >
          <ion-spinner v-if="saving" name="crescent"></ion-spinner>
          <span v-else>{{ isEditing ? 'Bewaren' : 'Toevoegen' }}</span>
        </ion-button>
      </ion-content>
    </ion-modal>

    <ion-modal :is-open="isTicketModalOpen" @didDismiss="closeTicketModal">
      <ion-header>
        <ion-toolbar>
          <ion-title>Ticket Kopen</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="closeTicketModal">Sluiten</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding">
        <ion-list>
          <ion-item>
            <ion-label>
              <h2>Bezoeker</h2>
              <p>{{ selectedBezoeker?.first_name }} {{ selectedBezoeker?.last_name }}</p>
            </ion-label>
          </ion-item>

          <ion-item>
            <ion-select
              label="Selecteer concert *"
              label-placement="stacked"
              v-model="ticketFormData.concert_id"
              placeholder="Kies een concert"
              :class="{ 'ion-invalid': ticketErrors.concert_id, 'ion-touched': ticketErrors.concert_id }"
              :error-text="ticketErrors.concert_id"
              @ionChange="delete ticketErrors.concert_id"
            >
              <ion-select-option
                v-for="concert in concerten"
                :key="concert.id"
                :value="concert.id!"
              >
                {{ concert.artist }} &middot; {{ formatDatum(concert.date) }} &middot; {{ formatPrijs(concert.price) }}
              </ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-input
              label="Aantal tickets (max 5) *"
              label-placement="stacked"
              v-model.number="ticketFormData.tickets_count"
              type="number"
              min="1"
              max="5"
              :class="{ 'ion-invalid': ticketErrors.tickets_count, 'ion-touched': ticketErrors.tickets_count }"
              :error-text="ticketErrors.tickets_count"
              @ionInput="delete ticketErrors.tickets_count"
            ></ion-input>
          </ion-item>
        </ion-list>

        <ion-item lines="none" class="ion-margin-top" v-if="totaalPrijs !== null">
          <ion-label>
            <h2>Totaal</h2>
            <p>{{ formatPrijs(totaalPrijs) }}</p>
          </ion-label>
        </ion-item>

        <ion-button
          expand="block"
          class="ion-margin-top"
          :disabled="buying"
          @click="koopTicket"
        >
          <ion-spinner v-if="buying" name="crescent"></ion-spinner>
          <span v-else>Ticket Kopen</span>
        </ion-button>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonLabel,
  IonList,
  IonItem,
  IonInput,
  IonModal,
  IonSpinner,
  IonAlert,
  IonSelect,
  IonSelectOption,
  IonRefresher,
  IonRefresherContent,
  toastController,
  alertController
} from '@ionic/vue';
import { add, trash, ticket } from 'ionicons/icons';
import type { Bezoeker, Concert, NieuwTicket } from '../types';
import {
  getBezoekers,
  createBezoeker,
  updateBezoeker,
  deleteBezoeker,
  getConcerten,
  koopTicket as koopTicketAPI
} from '../services/api';

const legeBezoeker = (): Bezoeker => ({
  first_name: '',
  last_name: '',
  birth_date: '',
  email: ''
});

const legeTicket = (): NieuwTicket => ({
  concert_id: 0,
  visitor_id: 0,
  tickets_count: 1
});

const bezoekers = ref<Bezoeker[]>([]);
const concerten = ref<Concert[]>([]);
const loading = ref(true);
const saving = ref(false);
const buying = ref(false);
const isBezoekerModalOpen = ref(false);
const isTicketModalOpen = ref(false);
const isEditing = ref(false);
const currentBezoeker = ref<Bezoeker | null>(null);
const selectedBezoeker = ref<Bezoeker | null>(null);
const bezoekerFormData = ref<Bezoeker>(legeBezoeker());
const ticketFormData = ref<NieuwTicket>(legeTicket());
const errors = ref<Partial<Record<keyof Bezoeker, string>>>({});
const ticketErrors = ref<{ concert_id?: string; tickets_count?: string }>({});
const errorAlert = ref(false);
const errorMessage = ref('');

const totaalPrijs = computed(() => {
  const concert = concerten.value.find((c) => c.id === ticketFormData.value.concert_id);
  if (!concert) {
    return null;
  }
  const stuksprijs = Number(concert.price);
  const aantal = Number(ticketFormData.value.tickets_count);
  if (Number.isNaN(stuksprijs) || Number.isNaN(aantal)) {
    return null;
  }
  return stuksprijs * aantal;
});

onMounted(async () => {
  await Promise.all([loadBezoekers(), loadConcerten()]);
});

async function loadBezoekers() {
  loading.value = true;
  try {
    bezoekers.value = await getBezoekers();
  } catch (error) {
    console.error('Fout bij laden bezoekers:', error);
    showError(foutBoodschap(error, 'Kon de bezoekers niet laden.'));
  } finally {
    loading.value = false;
  }
}

async function loadConcerten() {
  try {
    concerten.value = await getConcerten();
  } catch (error) {
    console.error('Fout bij laden concerten:', error);
  }
}

async function handleRefresh(event: CustomEvent) {
  await Promise.all([loadBezoekers(), loadConcerten()]);
  (event.target as HTMLIonRefresherElement).complete();
}

function openBezoekerModal(bezoeker?: Bezoeker) {
  if (bezoeker) {
    isEditing.value = true;
    currentBezoeker.value = bezoeker;
    bezoekerFormData.value = {
      first_name: bezoeker.first_name,
      last_name: bezoeker.last_name,
      birth_date: bezoeker.birth_date,
      email: bezoeker.email
    };
  } else {
    isEditing.value = false;
    currentBezoeker.value = null;
    bezoekerFormData.value = legeBezoeker();
  }
  errors.value = {};
  isBezoekerModalOpen.value = true;
}

function closeBezoekerModal() {
  isBezoekerModalOpen.value = false;
  currentBezoeker.value = null;
  errors.value = {};
}

function openTicketModal(bezoeker: Bezoeker) {
  selectedBezoeker.value = bezoeker;
  ticketFormData.value = {
    ...legeTicket(),
    visitor_id: bezoeker.id!
  };
  ticketErrors.value = {};
  isTicketModalOpen.value = true;
}

function closeTicketModal() {
  isTicketModalOpen.value = false;
  selectedBezoeker.value = null;
  ticketFormData.value = legeTicket();
  ticketErrors.value = {};
}

function wisFout(veld: keyof Bezoeker) {
  if (errors.value[veld]) {
    delete errors.value[veld];
  }
}

function validateBezoekerForm(): boolean {
  errors.value = {};

  if (!bezoekerFormData.value.first_name || bezoekerFormData.value.first_name.trim() === '') {
    errors.value.first_name = 'Voornaam is verplicht';
  }

  if (!bezoekerFormData.value.last_name || bezoekerFormData.value.last_name.trim() === '') {
    errors.value.last_name = 'Achternaam is verplicht';
  }

  if (!bezoekerFormData.value.birth_date) {
    errors.value.birth_date = 'Geboortedatum is verplicht';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!bezoekerFormData.value.email || !emailRegex.test(bezoekerFormData.value.email)) {
    errors.value.email = 'Geldig e-mailadres is verplicht';
  }

  return Object.keys(errors.value).length === 0;
}

function validateTicketForm(): boolean {
  ticketErrors.value = {};

  if (!ticketFormData.value.concert_id) {
    ticketErrors.value.concert_id = 'Selecteer een concert';
  }

  const aantal = Number(ticketFormData.value.tickets_count);
  if (!aantal || aantal <= 0) {
    ticketErrors.value.tickets_count = 'Aantal tickets moet minimaal 1 zijn';
  } else if (aantal > 5) {
    ticketErrors.value.tickets_count = 'Je kunt maximaal 5 tickets kopen';
  }

  return Object.keys(ticketErrors.value).length === 0;
}

async function saveBezoeker() {
  if (!validateBezoekerForm()) {
    return;
  }

  saving.value = true;
  try {
    if (isEditing.value && currentBezoeker.value?.id) {
      await updateBezoeker(currentBezoeker.value.id, bezoekerFormData.value);
      showToast('Bezoeker succesvol bijgewerkt!');
    } else {
      await createBezoeker(bezoekerFormData.value);
      showToast('Bezoeker succesvol toegevoegd!');
    }

    closeBezoekerModal();
    await loadBezoekers();
  } catch (error) {
    console.error('Fout bij opslaan bezoeker:', error);
    showError(foutBoodschap(error, 'Kon de bezoeker niet opslaan.'));
  } finally {
    saving.value = false;
  }
}

async function koopTicket() {
  if (!validateTicketForm()) {
    return;
  }

  buying.value = true;
  try {
    await koopTicketAPI({
      concert_id: Number(ticketFormData.value.concert_id),
      visitor_id: Number(ticketFormData.value.visitor_id),
      tickets_count: Number(ticketFormData.value.tickets_count)
    });
    showToast('Ticket succesvol gekocht! Bekijk het in de tab Tickets.');
    closeTicketModal();
  } catch (error) {
    console.error('Fout bij kopen ticket:', error);
    showError(foutBoodschap(error, 'Kon het ticket niet kopen.'));
  } finally {
    buying.value = false;
  }
}

async function verwijderBezoeker(bezoeker: Bezoeker) {
  const alert = await alertController.create({
    header: 'Bezoeker verwijderen?',
    message: `Wil je ${bezoeker.first_name} ${bezoeker.last_name} definitief verwijderen?`,
    buttons: [
      { text: 'Annuleren', role: 'cancel' },
      {
        text: 'Verwijderen',
        role: 'destructive',
        handler: () => {
          void doeVerwijderen(bezoeker.id!);
        }
      }
    ]
  });
  await alert.present();
}

async function doeVerwijderen(id: number) {
  try {
    await deleteBezoeker(id);
    showToast('Bezoeker succesvol verwijderd!');
    await loadBezoekers();
  } catch (error) {
    console.error('Fout bij verwijderen bezoeker:', error);
    showError(foutBoodschap(error, 'Kon de bezoeker niet verwijderen.'));
  }
}

function formatDatum(datum?: string): string {
  if (!datum) {
    return 'geen datum';
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(datum)
    ? new Date(`${datum}T00:00:00`)
    : new Date(datum);

  if (isNaN(date.getTime())) {
    return 'ongeldige datum';
  }

  return date.toLocaleDateString('nl-BE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatPrijs(prijs?: number | string | null): string {
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
