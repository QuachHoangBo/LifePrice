import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ChevronLeft } from "lucide-react-native";

type Mode = "signin" | "signup";

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function handleSubmit() {
    if (!email.trim() || !password) {
      Alert.alert(
        "Thiếu thông tin",
        "Vui lòng nhập email và mật khẩu (mô phỏng, chưa có server thật).",
      );
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      Alert.alert("Mật khẩu", "Mật khẩu xác nhận không khớp.");
      return;
    }

    Alert.alert(
      mode === "signin" ? "Đăng nhập (demo)" : "Đăng ký (demo)",
      `Chế độ mô phỏng:\n${email.trim().toLowerCase()}\nKhông có tài khoản thật.`,
      [{ text: "OK", style: "default" }],
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar style="dark" />
      <SafeAreaView edges={["top"]} className="border-b border-slate-200 bg-white">
        <View className="flex-row items-center gap-3 px-2 py-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-100"
          >
            <ChevronLeft size={28} color="#0f172a" strokeWidth={2} />
          </Pressable>
          <Text className="flex-1 text-lg font-bold text-slate-900">
            Tài khoản LifePrice
          </Text>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="grow px-5 py-6 pb-16"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <Pressable
              onPress={() => setMode("signin")}
              className={`flex-1 rounded-xl py-2.5 ${
                mode === "signin" ? "bg-emerald-500" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-center text-sm font-semibold ${
                  mode === "signin" ? "text-white" : "text-slate-600"
                }`}
              >
                Đăng nhập
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode("signup")}
              className={`flex-1 rounded-xl py-2.5 ${
                mode === "signup" ? "bg-emerald-500" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-center text-sm font-semibold ${
                  mode === "signup" ? "text-white" : "text-slate-600"
                }`}
              >
                Đăng ký
              </Text>
            </Pressable>
          </View>

          <Text className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor="#94a3b8"
            className="mt-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 shadow-sm"
          />

          <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Mật khẩu
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            placeholderTextColor="#94a3b8"
            className="mt-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 shadow-sm"
          />

          {mode === "signup" ? (
            <>
              <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nhập lại mật khẩu
              </Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                secureTextEntry
                placeholderTextColor="#94a3b8"
                className="mt-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 shadow-sm"
              />
            </>
          ) : null}

          <Pressable
            onPress={handleSubmit}
            className="mt-8 rounded-2xl bg-emerald-500 py-4 shadow-sm active:opacity-85"
          >
            <Text className="text-center text-base font-bold text-white">
              {mode === "signin" ? "Đăng nhập (demo)" : "Đăng ký (demo)"}
            </Text>
          </Pressable>

          <Text className="mt-6 text-center text-xs leading-5 text-slate-500">
            Ứng dụng chưa kết nối backend. Đây chỉ là giao diện và luồng mô
            phỏng để kiểm tra UX.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
