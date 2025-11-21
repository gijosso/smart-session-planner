import Toast from "react-native-toast-message";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";

import { toastConfig } from "~/components/toast/toast-config";
import { Providers } from "~/contexts/providers";

import "../styles.css";

void SplashScreen.preventAutoHideAsync();

function RootLayout() {
  return (
    <Providers>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <Slot />
      <Toast config={toastConfig} topOffset={60} />
    </Providers>
  );
}

export default RootLayout;
