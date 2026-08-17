<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Login</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Login</ion-title>
        </ion-toolbar>
      </ion-header>

      <form @submit.prevent="loginUser">
        <ion-item>
            <ion-input label="Email*" type="email" v-model="email" required placeholder="example@example.com"></ion-input>
        </ion-item>

        <ion-item>
            <ion-input label="Password*" type="password" v-model="password" required placeholder="Enter Password"></ion-input>
        </ion-item>

        <div>
            <ion-button expand="block" type="submit" :disabled="isLoading">login</ion-button>
            <ion-alert
                :is-open="errorMessage !== ''"
                :header="alertHeader"
                :message="errorMessage"
                :buttons="['OK']"
                @didDismiss="errorMessage = ''"
            ></ion-alert>
            <ion-label>Don't have an account? <router-link to="/register"> Register </router-link> </ion-label>
        </div>

      </form>

    </ion-content>
  </ion-page>
</template>

<script setup>
    import { ref } from 'vue';
    import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
             IonItem, IonLabel, IonInput, IonButton, IonAlert } from '@ionic/vue';
    import { useRouter } from 'vue-router';
    import axios from 'axios';
    import { login } from '@/auth';

    const BASE_URL = import.meta.env.VITE_API_URL;
    const email = ref('');
    const password = ref('');
    const errorMessage = ref('');
    const alertHeader = ref('');
    const isLoading = ref(false);
    const router = useRouter();

    const showError = (header, message) => {
        alertHeader.value = header;
        errorMessage.value = message;
    };

    const validateForm = () => {
        const missing = [];
        if (!email.value.trim()) missing.push('Email');
        if (!password.value.trim()) missing.push('Password');

        if (missing.length > 0) {
            showError(
                'Missing fields',
                missing.length === 1
                    ? `${missing[0]} is required.`
                    : `Please fill in the following fields: ${missing.join(' and ')}.`
            );
            return false;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
            showError('Invalid email', 'Please enter a valid email address, for example example@example.com.');
            return false;
        }

        return true;
    };

    const loginUser = async () => {
        if (!validateForm()) return;

        isLoading.value = true;
        try {
            const response = await axios.post(`${BASE_URL}/api/auth/login`, {
                email: email.value,
                password: password.value
            });
            login(response.data.token, response.data.user);
            router.replace('/tabs/home');
        } catch (error) {
            console.error(error);
            showError('Login failed', 'Invalid email or password.');
        } finally {
            isLoading.value = false;
        }
    }
</script>

