import { Pressable, ScrollView, Text, View } from "react-native";
import type { ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import {
  ChevronLeft,
  CircleHelp,
  FileCheck,
  Info,
  Mail,
  Scale,
  ShieldCheck,
} from "lucide-react-native";

const version = Constants.expoConfig?.version ?? "1.0.0";

function SettingRow({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon: ReactNode;
}) {
  return (
    <View className="flex-row gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <View className="mt-0.5 h-9 w-9 items-center justify-center rounded-full bg-slate-100">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-sm font-bold text-slate-900">{title}</Text>
        <Text className="mt-1 text-sm leading-5 text-slate-600">{body}</Text>
      </View>
    </View>
  );
}

export default function AboutScreen() {
  const router = useRouter();

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
            Cài đặt
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerClassName="gap-4 px-5 py-5 pb-12"
        showsVerticalScrollIndicator={false}
      >
        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <Text className="text-xl font-bold text-slate-900">LifePrice</Text>
          <Text className="mt-1 text-sm leading-6 text-slate-600">
            Hệ sinh thái dữ liệu giá cả thực tế cho nhu cầu theo dõi nhanh mỗi
            ngày.
          </Text>
          <Text className="mt-3 text-xs font-semibold text-slate-500">
            Phiên bản v{version}
          </Text>
        </View>

        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-1 shadow-sm">
          <SettingRow
            title="Chính sách bảo mật"
            body="LifePrice không yêu cầu đăng nhập ở phiên bản hiện tại. Lịch sử giá được lưu cục bộ trên thiết bị để hiển thị lại trong vòng 30 ngày."
            icon={<ShieldCheck size={19} color="#059669" strokeWidth={2.25} />}
          />
          <SettingRow
            title="Điều khoản sử dụng"
            body="Người dùng sử dụng dữ liệu trong app cho mục đích tham khảo cá nhân và không can thiệp vào hệ thống thu thập dữ liệu."
            icon={<FileCheck size={19} color="#2563eb" strokeWidth={2.25} />}
          />
          <SettingRow
            title="Miễn trừ trách nhiệm"
            body="Dữ liệu giá chỉ mang tính chất tham khảo. LifePrice không chịu trách nhiệm cho quyết định đầu tư, mua bán hoặc giao dịch phát sinh từ thông tin trong app."
            icon={<Scale size={19} color="#d97706" strokeWidth={2.25} />}
          />
        </View>

        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-1 shadow-sm">
          <SettingRow
            title="Nguồn dữ liệu"
            body="Giá hôm nay được cập nhật từ nguồn live khi có cấu hình hợp lệ. Nếu nguồn live lỗi hoặc chưa cấu hình, app dùng dữ liệu mô phỏng để giữ trải nghiệm ổn định."
            icon={<Info size={19} color="#0f766e" strokeWidth={2.25} />}
          />
          <SettingRow
            title="Liên hệ & hỗ trợ"
            body="Gửi phản hồi, báo lỗi hoặc góp ý tính năng qua email quachhoangbo2113@gmail.com."
            icon={<Mail size={19} color="#7c3aed" strokeWidth={2.25} />}
          />
        </View>

        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-1 shadow-sm">
          <SettingRow
            title="FAQ"
            body="Giá vàng và xăng dầu có thể lệch so với điểm bán thực tế do thời điểm cập nhật, khu vực áp dụng hoặc thay đổi từ nguồn dữ liệu."
            icon={<CircleHelp size={19} color="#475569" strokeWidth={2.25} />}
          />
        </View>
      </ScrollView>
    </View>
  );
}
