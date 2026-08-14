<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Register</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Register</ion-title>
        </ion-toolbar>
      </ion-header>

      <form @submit.prevent="registerUser">
        <ion-item>
          <ion-input label="Username" v-model="username" required placeholder="Enter username"></ion-input>
        </ion-item>

        <ion-item>
            <ion-input label="Email" type="email" v-model="email" required placeholder="example@example.com"></ion-input>
        </ion-item>

        <ion-item>
            <ion-input label="Password" type="password" v-model="password" required placeholder="Enter Password"></ion-input>
        </ion-item>

        <div class="button-container">
          <ion-button expand="block" type="submit">Register</ion-button>
            <ion-alert
                trigger="present-alert"
                header="A Short Title Is Best"
                message="A message should be a short, complete sentence."
                :buttons="alertButtons"
            ></ion-alert>
            <ion-label>you already have an account? <router-link to="/login"> Login </router-link> </ion-label>

        </div>
      </form>

    </ion-content>
  </ion-page>
</template>

<script setup>
    import { ref } from 'vue';
    import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
             IonItem, IonLabel, IonInput, IonButton, IonAlert } from '@ionic/vue';
    //import { useRouter } from 'vue-router';
    import axios from 'axios';

    const username = ref('');
    const email = ref('');
    const password = ref('');

    const errorMessage = ref('');
    const loading = ref('');

    const registerUser = async () => {
        try {
            const response = await axios.post('http://localhost:3000/api/register', {
                username: username.value,
                email: email.value,
                password: password.value
            });
            console.log(response.data);
            // Handle successful registration, e.g., redirect to login page
        } catch (error) {
            console.error(error);
            // Handle registration error, e.g., show error message
        }
    }
</script>