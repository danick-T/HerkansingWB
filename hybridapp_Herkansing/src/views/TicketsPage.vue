<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Tickets</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Tickets</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div v-if="loading" class="ion-padding ion-text-center">
        <ion-spinner></ion-spinner>
        <p>Tickets worden geladen...</p>
      </div>

      <ion-alert
        :is-open="errorAlert"
        header="Er ging iets mis"
        :message="errorMessage"
        :buttons="['OK']"
        @didDismiss="errorAlert = false"
      ></ion-alert>

      <ion-card v-if="!loading && tickets.length > 0" class="ion-margin">
        <ion-card-header>
          <ion-card-subtitle>Totaal verkocht</ion-card-subtitle>
          <ion-card-title>{{ totaalTickets }} tickets &middot; {{ formatPrijs(totaalOmzet) }}</ion-card-title>
        </ion-card-header>
      </ion-card>

      <ion-list v-if="!loading && tickets.length > 0">
        <ion-item v-for="t in tickets" :key="t.id">
          <ion-label>
            <h2>{{ t.artist }}</h2>
            <h3>{{ t.first_name }} {{ t.last_name }}</h3>
            <p>
              {{ t.tickets_count }} &times; {{ formatPrijs(t.price) }} =
              {{ formatPrijs(rijTotaal(t)) }}
            </p>
            <p>{{ t.venue }} &middot; {{ formatDatum(t.date) }}</p>
          </ion-label>

          <ion-button
            slot="end"
            fill="clear"
            color="danger"
            @click="verwijderTicket(t)"
          >
            <ion-icon :icon="trash"></ion-icon>
          </ion-button>
        </ion-item>
      </ion-list>

      <div v-if="!loading && tickets.length === 0" class="ion-padding">
        <p>Er zijn nog geen tickets verkocht. Koop een ticket via de tab Bezoekers.</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onIonViewWillEnter } from '@ionic/vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonSpinner,
  IonAlert,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonRefresher,
  IonRefresherContent,
  toastController,
  alertController
} from '@ionic/vue';
import { trash } from 'ionicons/icons';
import type { Ticket } from '../types';
import { getTickets, deleteTicket } from '../services/api';

const tickets = ref<Ticket[]>([]);
const loading = ref(true);
const errorAlert = ref(false);
const errorMessage = ref('');

const totaalTickets = computed(() =>
  tickets.value.reduce((som, t) => som + Number(t.tickets_count || 0), 0)
);

const totaalOmzet = computed(() =>
  tickets.value.reduce((som, t) => som + rijTotaal(t), 0)
);

onIonViewWillEnter(async () => {
  await loadTickets();
});

async function loadTickets() {
  loading.value = true;
  try {
    tickets.value = await getTickets();
  } catch (error) {
    console.error('Fout bij laden tickets:', error);
    showError(foutBoodschap(error, 'Kon de tickets niet laden.'));
  } finally {
    loading.value = false;
  }
}

async function handleRefresh(event: CustomEvent) {
  await loadTickets();
  (event.target as HTMLIonRefresherElement).complete();
}

function rijTotaal(t: Ticket): number {
  const stuksprijs = Number(t.price);
  const aantal = Number(t.tickets_count);
  if (Number.isNaN(stuksprijs) || Number.isNaN(aantal)) {
    return 0;
  }
  return stuksprijs * aantal;
}

async function verwijderTicket(t: Ticket) {
  const alert = await alertController.create({
    header: 'Ticket verwijderen?',
    message: `Wil je de tickets van ${t.first_name} ${t.last_name} voor ${t.artist} verwijderen?`,
    buttons: [
      { text: 'Annuleren', role: 'cancel' },
      {
        text: 'Verwijderen',
        role: 'destructive',
        handler: () => {
          void doeVerwijderen(t.id!);
        }
      }
    ]
  });
  await alert.present();
}

async function doeVerwijderen(id: number) {
  try {
    await deleteTicket(id);
    showToast('Ticket succesvol verwijderd!');
    await loadTickets();
  } catch (error) {
    console.error('Fout bij verwijderen ticket:', error);
    showError(foutBoodschap(error, 'Kon het ticket niet verwijderen.'));
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
