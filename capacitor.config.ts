import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pivot.galaxy",
  appName: "Pivot Galaxy",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
};

export default config;
