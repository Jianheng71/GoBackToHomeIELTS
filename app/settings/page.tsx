import { AppShell } from "@/components/AppShell";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export default function SettingsPage() {
  return (
    <AppShell title="设置" subtitle="出题范围、动态效果、API 说明、声明、清除本机数据">
      <SettingsPanel />
    </AppShell>
  );
}