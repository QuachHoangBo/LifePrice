import { useCallback, useEffect, useRef } from "react";
import { Image, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";

const LOGO = require("../assets/images/logo.png");

/** Plain splash background color. Change this if the brand color changes. */
const SPLASH_BG = "#2081E2";

const LOAD_MS = 1100;

export default function LoadingScreen() {
  const router = useRouter();
  const navigatedRef = useRef(false);

  const finish = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    router.replace("/home");
  }, [router]);

  useEffect(() => {
    void SplashScreen.hideAsync();
    const t = setTimeout(finish, LOAD_MS);
    return () => clearTimeout(t);
  }, [finish]);

  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: SPLASH_BG }}
      accessibilityLabel="LifePrice đang tải"
      accessibilityRole="progressbar"
    >
      <StatusBar style="dark" />

      <View
        className="h-[220px] w-[220px] items-center justify-center rounded-full bg-white"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.14,
          shadowRadius: 28,
          elevation: 10,
        }}
      >
        <Image
          source={LOGO}
          accessibilityLabel="Logo LifePrice"
          resizeMode="contain"
          style={{ width: 420, height: 420 }}
        />
      </View>

      <Text className="mt-10 text-[36px] font-bold tracking-tight text-white">
        LifePrice
      </Text>
    </View>
  );
}
