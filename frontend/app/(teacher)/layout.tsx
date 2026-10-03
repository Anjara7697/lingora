import { StaffShell } from "@/components/shell/StaffShell";

export default function StaffLayout({ children }: LayoutProps<"/">) {
  return <StaffShell>{children}</StaffShell>;
}
