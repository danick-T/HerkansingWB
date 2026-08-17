<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/home"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ group?.name ?? 'Group' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <!-- Totalen: berekend uit de transacties zelf -->
      <ion-card>
        <ion-card-header>
          <ion-card-subtitle>Balance</ion-card-subtitle>
          <ion-card-title :color="balance >= 0 ? 'success' : 'danger'">
            {{ formatAmount(balance) }}
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-grid class="ion-no-padding">
            <ion-row>
              <ion-col>
                <ion-text color="success">
                  <h3>{{ formatAmount(totalIncome) }}</h3>
                </ion-text>
                <ion-note>Income</ion-note>
              </ion-col>
              <ion-col>
                <ion-text color="danger">
                  <h3>{{ formatAmount(totalExpenses) }}</h3>
                </ion-text>
                <ion-note>Expenses</ion-note>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>

      <ion-list :inset="true">
        <ion-list-header>
          <ion-label>Transactions</ion-label>
        </ion-list-header>

        <ion-item v-if="isLoading">
          <ion-label>Loading transactions...</ion-label>
        </ion-item>

        <ion-item v-else-if="errorMessage">
          <ion-label color="danger">{{ errorMessage }}</ion-label>
        </ion-item>

        <ion-item v-else-if="transactions.length === 0">
          <ion-label>
            No transactions yet
            <p>Add a receipt to get started.</p>
          </ion-label>
        </ion-item>

        <ion-item v-for="tx in transactions" :key="tx.id">
          <ion-thumbnail slot="start" v-if="receiptOf(tx)">
            <ion-img :src="receiptOf(tx)" alt="Receipt"></ion-img>
          </ion-thumbnail>

          <ion-label>
            {{ tx.description || 'No description' }}
            <p>{{ formatDate(tx.date) }}</p>
          </ion-label>

          <ion-text slot="end" :color="tx.type === 'income' ? 'success' : 'danger'">
            {{ tx.type === 'income' ? '+' : '-' }}{{ formatAmount(Number(tx.amount)) }}
          </ion-text>
        </ion-item>
      </ion-list>

      <div class="ion-padding">
        <ion-button expand="block" @click="goToAddReceipt">Add receipt</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, inject } from 'vue';
import {
  onIonViewWillEnter,
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonGrid, IonRow, IonCol, IonText, IonNote,
  IonList, IonListHeader, IonItem, IonLabel, IonThumbnail, IonImg,
  IonRefresher, IonRefresherContent
} from '@ionic/vue';
import { useRoute, useRouter } from 'vue-router';

const BASE_URL = import.meta.env.VITE_API_URL;
const axios = inject('axios');
const route = useRoute();
const router = useRouter();

/* De groep uit het pad: /tabs/mygroup/:householdId */
const householdId = route.params.householdId;

const group = ref(null);
const transactions = ref([]);
const isLoading = ref(true);
const errorMessage = ref('');

/* Postgres geeft numeric terug als string, dus altijd door Number() halen. */
const totalIncome = computed(() =>
  transactions.value
    .filter((tx) => tx.type === 'income')
    .reduce((som, tx) => som + Number(tx.amount), 0)
);

const totalExpenses = computed(() =>
  transactions.value
    .filter((tx) => tx.type === 'expense')
    .reduce((som, tx) => som + Number(tx.amount), 0)
);

const balance = computed(() => totalIncome.value - totalExpenses.value);

const formatAmount = (value) =>
  new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(value || 0);

const formatDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('nl-BE');
};

/* De API kan camelCase of snake_case teruggeven: vang beide op. */
const receiptOf = (tx) => tx.receiptImage ?? tx.receipt_image ?? null;

const loadData = async () => {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    const [householdsResponse, transactionsResponse] = await Promise.all([
      axios.get(`${BASE_URL}/api/households`),
      axios.get(`${BASE_URL}/api/households/${householdId}/transactions`)
    ]);

    group.value = householdsResponse.data.find(
      (h) => String(h.id) === String(householdId)
    ) ?? null;

    transactions.value = transactionsResponse.data;
  } catch (error) {
    console.error(error);
    errorMessage.value =
      error.response?.data?.message ?? 'Could not load this group.';
  } finally {
    isLoading.value = false;
  }
};

/* Ionic lifecycle (les 4, slide 7): draait elke keer dat je deze pagina binnenkomt,
   dus ook als je terugkomt na het toevoegen van een bonnetje. */
onIonViewWillEnter(loadData);

const handleRefresh = async (event) => {
  await loadData();
  event.target.complete();
};

const goToAddReceipt = () => {
  router.push('/tabs/addrecipt');
};
</script>
