import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.saborygestion.app',
  appName: 'Sabor y Gestion',
  webDir: 'out',
  server: {
    // Descomenta la siguiente línea y pon tu URL para que la App cargue tu web en vivo
    url: 'https://sabor-y-gestion-847q2uvsr-stackbridgesystems-1583s-projects.vercel.app',
    cleartext: true
  }
};

export default config;
