// เรียกใช้ Component ฟอร์มที่เราสร้างไว้
// หมายเหตุ: ถ้าไฟล์ SubreceiveForm.tsx อยู่ในโฟลเดอร์อื่น (เช่น components) ให้แก้ path ตรงนี้นะครับ
// เช่น import SubreceiveForm from '@/components/SubreceiveForm';
import SubreceiveForm from "./SubreceiveForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {/* แสดงผลฟอร์ม */}
      <SubreceiveForm />
    </main>
  );
}
