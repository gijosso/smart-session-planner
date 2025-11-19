import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";

import { Providers } from "~/contexts/providers";

import "../styles.css";

void SplashScreen.preventAutoHideAsync();

function RootLayout() {
  return (
    <Providers>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <Slot />
    </Providers>
  );
}

export default RootLayout;
