import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.saborygestion.app',
  appName: 'Sabor y Gestion',
  webDir: 'out',
  server: {
    // Descomenta la siguiente línea y pon tu URL para que la App cargue tu web en vivo
    // url: 'https://tu-dominio.com/dashboard/delivery',
    cleartext: true
  }
};

export default config;
