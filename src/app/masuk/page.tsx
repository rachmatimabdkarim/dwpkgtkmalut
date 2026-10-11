import type { Metadata } from "next";
import { FormMasuk } from "@/components/form-masuk";

export const metadata: Metadata = { title: "Masuk · SI-ANGGUN" };

export default function HalamanMasuk() {
  return <FormMasuk />;
}
