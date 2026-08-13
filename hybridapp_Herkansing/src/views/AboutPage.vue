<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>About</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">About</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-card class="ion-margin">
        <ion-card-header>
          <ion-card-title>Over deze App</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p>
            Welkom bij de Concert Beheer App! 
            Deze app helpt je om concerten en bezoekers te beheren.
          </p>
          <p>
            Met deze app kun je:
          </p>
          <ul>
            <li>Concerten toevoegen, bewerken en verwijderen</li>
            <li>Bezoekers toevoegen, bewerken en verwijderen</li>
            <li>Tickets verkopen aan bezoekers (max 5 per aankoop)</li>
            <li>Alle verkochte tickets en de totale omzet bekijken</li>
          </ul>
        </ion-card-content>
      </ion-card>

      <ion-card class="ion-margin">
        <ion-card-header>
          <ion-card-title>Ontwikkelaar</ion-card-title>
        </ion-card-header>

        <ion-card-content>
          <div class="ion-text-center ion-margin-bottom">
            <ion-avatar class="profile-avatar">
              <img
                :src="profielFoto"
                alt="Profielfoto ontwikkelaar"
                @error="onImageError"
              />
            </ion-avatar>
          </div>

          <div class="ion-text-center">
            <h2>Danick Tchang</h2>
            <p>Student Toegepaste Informatica</p>
            <p>Hogeschool Odisee</p>
            <p>Email: danick.tchang@student.odisee.com</p>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card class="ion-margin">
        <ion-card-header>
          <ion-card-title>Technische Informatie</ion-card-title>
        </ion-card-header>

        <ion-card-content>
          <p>
            Deze app is gebouwd met:
          </p>
          <ul>
            <li>Ionic Vue - Voor de UI componenten</li>
            <li>Vue 3 - JavaScript framework</li>
            <li>TypeScript - Voor type safety</li>
            <li>Capacitor - Voor native functionaliteit</li>
            <li>RESTful API - Voor data opslag</li>
          </ul>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonAvatar
} from '@ionic/vue';

import profielFoto from '../assets/photo.jpg';

function onImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Crect fill=\'%23ddd\' width=\'200\' height=\'200\'/%3E%3Ctext fill=\'%23999\' font-family=\'sans-serif\' font-size=\'14\' dy=\'10.5\' font-weight=\'bold\' x=\'50%25\' y=\'50%25\' text-anchor=\'middle\'%3EGeen Foto%3C/text%3E%3C/svg%3E';
}
</script>

<style scoped>
.profile-avatar {
  width: 150px;
  height: 150px;
  margin: 0 auto;
  --border-radius: 50%;
}

.profile-avatar img {
  border-radius: 50%;
  object-fit: cover;
}

ul {
  text-align: left;
  padding-left: 20px;
}

li {
  margin-bottom: 8px;
}
</style>
