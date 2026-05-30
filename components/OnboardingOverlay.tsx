import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Coins, Droplet, History } from "lucide-react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";

const ONBOARDING_KEY = "lifeprice:onboarding:done";

const STEPS = [
  {
    Icon: Droplet,
    iconColor: "#3b82f6",
    iconBg: "bg-blue-50",
    title: "Giá xăng dầu",
    desc: "Xem giá RON 95, E5 RON 92 và Diesel cập nhật theo từng ngày. Mũi tên cho biết giá tăng hay giảm so với hôm trước.",
  },
  {
    Icon: Coins,
    iconColor: "#f59e0b",
    iconBg: "bg-amber-50",
    title: "Giá vàng SJC",
    desc: "Theo dõi giá mua vào và bán ra của vàng SJC tính theo đồng/chỉ, cập nhật hàng ngày.",
  },
  {
    Icon: History,
    iconColor: "#10b981",
    iconBg: "bg-emerald-50",
    title: "Lịch sử & Biểu đồ",
    desc: "Nhấn nút Lịch sử để xem biến động giá 30 ngày gần nhất. Biểu đồ phía dưới mỗi thẻ cho thấy xu hướng nhanh.",
  },
];

type Props = {
  onFinish: () => void;
};

export function OnboardingOverlay({ onFinish }: Props) {
  const [step, setStep] = useState(0);
  const [cardKey, setCardKey] = useState(0);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step]!;

  const goNext = () => {
    if (isLast) {
      onFinish();
      return;
    }
    setStep((s) => s + 1);
    setCardKey((k) => k + 1); // re-mount card để trigger entering animation
  };

  return (
    <Modal transparent animationType="fade" statusBarTranslucent>
      {/* Backdrop */}
      <View className="absolute inset-0 bg-black/60" />

      {/* Card */}
      <View className="flex-1 items-center justify-center px-6">
        <Animated.View
          key={cardKey}
          entering={SlideInDown.duration(300).springify()}
          exiting={SlideOutDown.duration(200)}
          className="w-full rounded-3xl bg-white px-6 pb-7 pt-8"
        >
          {/* Icon */}
          <View
            className={`mb-5 h-16 w-16 items-center justify-center rounded-2xl ${current.iconBg}`}
          >
            <current.Icon size={32} color={current.iconColor} strokeWidth={2} />
          </View>

          {/* Title */}
          <Text className="mb-2 text-xl font-bold text-slate-900">
            {current.title}
          </Text>

          {/* Description */}
          <Text className="mb-8 text-sm leading-6 text-slate-500">
            {current.desc}
          </Text>

          {/* Dots */}
          <View className="mb-6 flex-row gap-1.5">
            {STEPS.map((_, i) => (
              <View
                key={i}
                className={`h-1.5 rounded-full ${
                  i === step ? "w-5 bg-emerald-500" : "w-1.5 bg-slate-200"
                }`}
              />
            ))}
          </View>

          {/* Button */}
          <Pressable
            onPress={goNext}
            className="items-center rounded-2xl bg-emerald-500 py-4 active:opacity-80"
          >
            <Text className="text-sm font-bold text-white">
              {isLast ? "Bắt đầu" : "Tiếp tục"}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Hook dùng trong HomeScreen
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((v) => {
      if (!v) setShowOnboarding(true);
    });
  }, []);

  const finishOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    setShowOnboarding(false);
  };

    const resetOnboarding = async () => {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    setShowOnboarding(true);
  };

  return { showOnboarding, finishOnboarding, resetOnboarding };
}