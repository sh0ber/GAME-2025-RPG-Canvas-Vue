import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import { engine } from './game/Engine.js';

createApp(App).mount('#app');

engine.initialize(); 