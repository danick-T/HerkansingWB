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

      <!-- Totalen: berekend uit de transacties van deze pagina -->
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
                <ion-text color="success"><h3>{{ formatAmount(totalIncome) }}</h3></ion-text>
                <ion-note>Income</ion-note>
              </ion-col>
              <ion-col>
                <ion-text color="danger"><h3>{{ formatAmount(totalExpenses) }}</h3></ion-text>
                <ion-note>Expenses</ion-note>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>

      <!-- Wie betaalde wat: elk lid tegenover zijn eerlijk deel -->
      <ion-list :inset="true">
        <ion-list-header>
          <ion-label>Who paid what</ion-label>
          <ion-note slot="end">share {{ formatAmount(fairShare) }}</ion-note>
        </ion-list-header>

        <ion-item v-if="isLoading">
          <ion-label>Loading members...</ion-label>
        </ion-item>

        <ion-item v-else-if="perMember.length === 0">
          <ion-label>No members found</ion-label>
        </ion-item>

        <ion-item v-for="member in perMember" :key="member.id">
          <ion-label>
            {{ member.name }}<ion-note v-if="member.isMe"> (you)</ion-note>
            <p>paid {{ formatAmount(member.paidExpenses) }}
               <span v-if="member.toppedUp > 0"> + topped up {{ formatAmount(member.toppedUp) }}</span>
            </p>
          </ion-label>

          <ion-button
            v-if="member.isMe && member.balance < 0"
            slot="end"
            size="small"
            @click="openTopUp"
          >
            Top up
          </ion-button>

          <ion-text v-else slot="end" :color="member.balance >= 0 ? 'success' : 'danger'">
            {{ member.balance >= 0 ? 'gets back' : 'owes' }}
            {{ formatAmount(Math.abs(member.balance)) }}
          </ion-text>
        </ion-item>
      </ion-list>

      <ion-list :inset="true">
        <ion-list-header>
          <ion-label>Transactions</ion-label>
          <ion-note slot="end">{{ total }} total</ion-note>
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

        <ion-item
          v-for="tx in transactions"
          :key="tx.id"
          :button="tx.hasReceipt"
          :detail="false"
          @click="tx.hasReceipt && openReceipt(tx)"
        >
          <ion-icon
            v-if="tx.hasReceipt"
            slot="start"
            :icon="receiptOutline"
            color="medium"
          ></ion-icon>

          <ion-label>
            {{ tx.description || 'No description' }}
            <p>{{ formatDate(tx.date) }} - {{ tx.user?.name ?? 'Unknown' }}</p>
            <p v-if="tx.category">
              <ion-badge :style="{ backgroundColor: tx.category.color }">
                {{ tx.category.name }}
              </ion-badge>
            </p>
          </ion-label>

          <ion-text slot="end" :color="tx.type === 'income' ? 'success' : 'danger'">
            {{ tx.type === 'income' ? '+' : '-' }}{{ formatAmount(Number(tx.amount)) }}
          </ion-text>
        </ion-item>
      </ion-list>

      <div class="ion-padding">
        <ion-button expand="block" @click="goToAddReceipt">Add receipt</ion-button>
      </div>

      <!-- Top up: je eigen schuld (deels) aanzuiveren.
           In een echte app zou hier een betaling met kaart gebeuren; die is
           voor dit project bewust niet ingebouwd. -->
      <ion-modal :is-open="isTopUpOpen" @didDismiss="closeTopUp">
        <ion-header>
          <ion-toolbar>
            <ion-title>Top up</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeTopUp">Cancel</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <ion-card>
            <ion-card-header>
              <ion-card-subtitle>You owe</ion-card-subtitle>
              <ion-card-title color="danger">{{ formatAmount(amountOwed) }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              Pay any amount between {{ formatAmount(0.01) }} and {{ formatAmount(amountOwed) }}.
            </ion-card-content>
          </ion-card>

          <form @submit.prevent="saveTopUp">
            <ion-list>
              <ion-item>
                <ion-input
                  label="Amount (EUR)*"
                  label-placement="stacked"
                  type="number"
                  inputmode="decimal"
                  step="0.01"
                  min="0.01"
                  :max="amountOwed"
                  v-model="topUpAmount"
                  placeholder="0.00"
                ></ion-input>
              </ion-item>
            </ion-list>

            <div class="ion-padding">
              <ion-button expand="block" fill="outline" @click="fillFullAmount">
                Pay everything ({{ formatAmount(amountOwed) }})
              </ion-button>

              <ion-button expand="block" type="submit" :disabled="isSavingTopUp">
                {{ isSavingTopUp ? 'Saving...' : 'Confirm payment' }}
              </ion-button>
            </div>
          </form>
        </ion-content>
      </ion-modal>

      <ion-alert
        :is-open="topUpError !== ''"
        header="Could not top up"
        :message="topUpError"
        :buttons="['OK']"
        @didDismiss="topUpError = ''"
      ></ion-alert>

      <ion-toast
        :is-open="showTopUpSuccess"
        message="Payment added."
        :duration="2000"
        @didDismiss="showTopUpSuccess = false"
      ></ion-toast>

      <!-- De bon zit niet in de lijst (alleen hasReceipt), dus die halen we
           per transactie op via GET /transactions/:id -->
      <ion-modal :is-open="isReceiptOpen" @didDismiss="closeReceipt">
        <ion-header>
          <ion-toolbar>
            <ion-title>Receipt</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeReceipt">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <ion-label v-if="isLoadingReceipt">Loading receipt...</ion-label>
          <ion-img v-else-if="receiptImage" :src="receiptImage" alt="Receipt"></ion-img>
          <ion-label v-else color="danger">Could not load the receipt.</ion-label>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, inject } from 'vue';
import {
  onIonViewWillEnter,
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonButton, IonModal,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonGrid, IonRow, IonCol, IonText, IonNote, IonIcon,
  IonList, IonListHeader, IonItem, IonLabel, IonImg, IonBadge,
  IonRefresher, IonRefresherContent, IonAlert, IonToast
} from '@ionic/vue';
import { receiptOutline } from 'ionicons/icons';
import { useRoute, useRouter } from 'vue-router';
import { user } from '@/auth';

const BASE_URL = import.meta.env.VITE_API_URL;
const axios = inject('axios');
const route = useRoute();
const router = useRouter();

/* De groep uit het pad: /tabs/mygroup/:householdId */
const householdId = route.params.householdId;

const group = ref(null);
const transactions = ref([]);
const total = ref(0);
const members = ref([]);
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

/* Wie betaalde wat.
   Iedereen draagt een gelijk deel van de uitgaven: dat is het 'fair share'.
   Wie meer betaalde dan zijn deel, krijgt geld terug; wie minder betaalde,
   moet bijleggen. Leden die niets betaalden staan er ook in, daarom halen we
   de ledenlijst op in plaats van hem uit de transacties af te leiden. */
const fairShare = computed(() =>
  members.value.length > 0 ? totalExpenses.value / members.value.length : 0
);

const perMember = computed(() =>
  members.value.map((membership) => {
    const userId = membership.user.id;

    // Wat deze persoon zelf voorschoot door een bon te betalen.
    const paidExpenses = transactions.value
      .filter((tx) => tx.type === 'expense' && tx.user?.id === userId)
      .reduce((som, tx) => som + Number(tx.amount), 0);

    // Wat deze persoon achteraf bijstortte (top-up = income).
    const toppedUp = transactions.value
      .filter((tx) => tx.type === 'income' && tx.user?.id === userId)
      .reduce((som, tx) => som + Number(tx.amount), 0);

    return {
      id: membership.id,
      userId,
      name: membership.user.name ?? membership.user.email,
      isMe: userId === user.value?.id,
      paidExpenses,
      toppedUp,
      balance: paidExpenses + toppedUp - fairShare.value
    };
  })
);

/* Wat jij nog moet betalen. Naar beneden afgerond op cent, zodat je nooit
   een cent meer kan storten dan je schuld. */
const amountOwed = computed(() => {
  const me = perMember.value.find((member) => member.isMe);
  if (!me || me.balance >= 0) return 0;
  return Math.floor(Math.abs(me.balance) * 100) / 100;
});

const formatAmount = (value) =>
  new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(value || 0);

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('nl-BE') : '');

const loadData = async () => {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    const [householdResponse, transactionsResponse, membershipsResponse] = await Promise.all([
      axios.get(`${BASE_URL}/api/households/${householdId}`),
      axios.get(`${BASE_URL}/api/households/${householdId}/transactions`, {
        params: { limit: 100 }
      }),
      axios.get(`${BASE_URL}/api/households/${householdId}/memberships`)
    ]);

    group.value = householdResponse.data;
    members.value = membershipsResponse.data;

    // De API stuurt { data, page, limit, total } terug, geen platte array.
    transactions.value = transactionsResponse.data.data;
    total.value = transactionsResponse.data.total;
  } catch (error) {
    console.error(error);
    errorMessage.value = error.response?.data?.message ?? 'Could not load this group.';
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

/* ---- Bon bekijken ---- */
const isReceiptOpen = ref(false);
const isLoadingReceipt = ref(false);
const receiptImage = ref(null);

const openReceipt = async (tx) => {
  isReceiptOpen.value = true;
  isLoadingReceipt.value = true;
  receiptImage.value = null;

  try {
    const response = await axios.get(
      `${BASE_URL}/api/households/${householdId}/transactions/${tx.id}`
    );
    receiptImage.value = response.data.receiptImage;
  } catch (error) {
    console.error(error);
  } finally {
    isLoadingReceipt.value = false;
  }
};

const closeReceipt = () => {
  isReceiptOpen.value = false;
  receiptImage.value = null;
};

/* ---- Top up ---- */
const isTopUpOpen = ref(false);
const topUpAmount = ref('');
const isSavingTopUp = ref(false);
const topUpError = ref('');
const showTopUpSuccess = ref(false);

const openTopUp = () => {
  topUpAmount.value = '';
  isTopUpOpen.value = true;
};

const closeTopUp = () => {
  isTopUpOpen.value = false;
};

const fillFullAmount = () => {
  topUpAmount.value = String(amountOwed.value);
};

const saveTopUp = async () => {
  const bedrag = Number(topUpAmount.value);

  if (!Number.isFinite(bedrag) || bedrag < 0.01) {
    topUpError.value = 'Enter an amount of at least 0.01 EUR.';
    return;
  }

  if (bedrag > amountOwed.value) {
    topUpError.value = `You cannot pay more than you owe (${formatAmount(amountOwed.value)}).`;
    return;
  }

  isSavingTopUp.value = true;

  try {
    // Een top-up is een income-transactie op naam van de ingelogde gebruiker.
    // De API haalt user_id uit het token, dus die sturen we bewust niet mee.
    await axios.post(`${BASE_URL}/api/households/${householdId}/transactions`, {
      type: 'income',
      amount: bedrag,
      date: new Date().toISOString().slice(0, 10),
      description: 'Top up',
      categoryId: null,
      receiptImage: null
    });

    closeTopUp();
    showTopUpSuccess.value = true;
    await loadData();
  } catch (error) {
    console.error(error);
    topUpError.value = error.response?.data?.message ?? 'The payment could not be saved.';
  } finally {
    isSavingTopUp.value = false;
  }
};

const goToAddReceipt = () => {
  router.push('/tabs/addrecipt');
};
</script>
