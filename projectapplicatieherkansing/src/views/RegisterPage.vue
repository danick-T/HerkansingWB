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
          <ion-input label="Username*" v-model="username" required placeholder="Enter username"></ion-input>
        </ion-item>

        <ion-item>
            <ion-input label="Email*" type="email" v-model="email" required placeholder="example@example.com"></ion-input>
        </ion-item>

        <ion-item>
            <ion-input label="Password*" type="password" v-model="password" required placeholder="Enter Password"></ion-input>
        </ion-item>

        <div>
          <ion-button expand="block" type="submit" :disabled="isLoading">Register</ion-button>
            <ion-alert
                :is-open="errorMessage !== ''"
                :header="alertHeader"
                :message="errorMessage"
                :buttons="['OK']"
                @didDismiss="errorMessage = ''"
            ></ion-alert>
            <ion-label>you already have an account? <router-link to="/login"> Login </router-link> </ion-label>

        </div>
      </form>

    </ion-content>
  </ion-page>
</template>

<script setup>
    import { ref, inject } from 'vue';
    import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
             IonItem, IonLabel, IonInput, IonButton, IonAlert } from '@ionic/vue';
    import { useRouter } from 'vue-router';
    import { login } from '@/auth';

    const username = ref('');
    const email = ref('');
    const password = ref('');
    const BASE_URL = import.meta.env.VITE_API_URL;
    const errorMessage = ref('');
    const alertHeader = ref('');
    const isLoading = ref(false);
    const router = useRouter();
    const axios = inject('axios');

    const showError = (header, message) => {
        alertHeader.value = header;
        errorMessage.value = message;
    };

    const validateForm = () => {
        const missing = [];
        if (!username.value.trim()) missing.push('Username');
        if (!email.value.trim()) missing.push('Email');
        if (!password.value.trim()) missing.push('Password');

        if (missing.length > 0) {
            showError(
                'Missing fields',
                missing.length === 1
                    ? `${missing[0]} is required.`
                    : `Please fill in the following fields: ${missing.join(', ')}.`
            );
            return false;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
            showError('Invalid email', 'Please enter a valid email address, for example example@example.com.');
            return false;
        }

        if (password.value.length < 8) {
            showError('Password too short', 'Your password must be at least 8 characters long.');
            return false;
        }

        return true;
    };

    const registerUser = async () => {
        if (!validateForm()) return;

        isLoading.value = true;
        try {
            const response = await axios.post(`${BASE_URL}/api/auth/register`, {
                username: username.value,
                email: email.value,
                password: password.value
            });
            login(response.data.token, response.data.user);
            router.replace('/tabs/ProfilePage');
        } catch (error) {
            console.error(error);
            // Handle registration error, e.g., show error message
            showError('Registration failed', 'Registration failed. Please try again.');
        } finally {
            isLoading.value = false;
        }
    }
</script>