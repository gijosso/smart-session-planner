import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { Providers } from "~/contexts/providers";

import "../styles.css";

function RootLayout() {
  return (
    <Providers>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <Slot />
    </Providers>
  );
}

export default RootLayout;
