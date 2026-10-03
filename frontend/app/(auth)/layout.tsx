export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8">{children}</main>;
}
