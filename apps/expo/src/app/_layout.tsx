import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";

import { Providers } from "~/contexts/providers";

import "../styles.css";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayout() {
  return (
    <Providers>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <Slot />
    </Providers>
  );
}

export default RootLayout;
