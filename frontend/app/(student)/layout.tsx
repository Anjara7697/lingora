import { StudentShell } from "@/components/shell/StudentShell";

export default function StudentLayout({ children }: LayoutProps<"/">) {
  return <StudentShell>{children}</StudentShell>;
}
