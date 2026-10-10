import { KerangkaPublik } from "@/components/publik/kerangka-publik";
import { pengaturanSitus } from "@/lib/publik";


export default async function LayoutPublik({
  children,
}: {
  children: React.ReactNode;
}) {
  const tema = await pengaturanSitus();

  return <KerangkaPublik tema={tema}>{children}</KerangkaPublik>;
}