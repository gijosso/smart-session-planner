import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { Providers } from "~/contexts/providers";

import "../styles.css";

function RootLayout() {
  return (
    <Providers>
      <Slot />
      <StatusBar style="dark" />
    </Providers>
  );
}

export default RootLayout;
