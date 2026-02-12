"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Minus,
  Plus,
  ChevronDown,
  Search,
  Check,
  Loader2,
} from "lucide-react";

// --- ข้อมูลคงที่ ---
const ADMIN_RECEIVERS = [
  { name: "นางขนิฎฐา แสงการ", signature: "/Signatures/signature-1.png" },
  {
    name: "นางสาวอัจฉราพรรณ คำสร้อย",
    signature: "/Signatures/signature-2.png",
  },
];

const THAI_MONTHS = [
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
];

interface Customer {
  name: string;
  houseNo: string;
  villageNo: string;
  defaultAmount: number;
  key: string;
}

export default function SubreceiveForm() {
  // --- Form State ---
  const INITIAL_FORM_DATA = {
    paymentDate: (() => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    })(),
    fiscalYear: "",
    customerName: "",
    houseNo: "",
    villageNo: "",
    amount: 0,
    adminReceiver: "",
    customerKey: "",
  };

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // สถานะกำลังบันทึก

  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [modalAmount, setModalAmount] = useState<number>(0);

  // --- Search State ---
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // --- Modal State ---
  const [showModal, setShowModal] = useState(false);
  const [paymentType, setPaymentType] = useState("");
  const [modalFiscalYear, setModalFiscalYear] = useState("");

  // --- Month Search State ---
  const [selectedMonth, setSelectedMonth] = useState("");
  const [monthSearchTerm, setMonthSearchTerm] = useState("");
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const monthDropdownRef = useRef<HTMLDivElement>(null);

  // --- Fetch Data ---
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch("/api/receivers");
        if (res.ok) {
          const data = await res.json();
          setCustomers(data.receivers);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (currentCustomer) {
      setModalAmount(currentCustomer.defaultAmount || 0);
    } else {
      setModalAmount(0);
    }
  }, [currentCustomer]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
      if (
        monthDropdownRef.current &&
        !monthDropdownRef.current.contains(event.target as Node)
      ) {
        setIsMonthDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Handlers ---
  const handleClear = () => {
    setFormData({
      ...INITIAL_FORM_DATA,
      paymentDate: INITIAL_FORM_DATA.paymentDate,
    });
    setSearchTerm("");
    setPaymentType("");
    setModalFiscalYear("");
    setSelectedMonth("");
    setMonthSearchTerm("");
    setCurrentCustomer(null);
    setModalAmount(0);
  };

  // ฟังก์ชันบันทึกข้อมูลลง Sheet (ทำงานเมื่อกดปุ่ม "บันทึก" มุมขวาบน)
  const handleSave = async () => {
    if (!confirm("ยืนยันการบันทึกข้อมูล?")) return;

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        selectedMonth, // ส่งเดือนที่เลือกไป
        modalFiscalYear, // ส่งปีงบจาก Modal ไป
        paymentType,
      };

      const res = await fetch("/api/save-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("บันทึกข้อมูลสำเร็จ!");
        handleClear(); // ล้างฟอร์มเมื่อสำเร็จ
      } else {
        alert("เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("ไม่สามารถเชื่อมต่อกับระบบได้");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const selectCustomer = (customer: Customer) => {
    setFormData((prev) => ({
      ...prev,
      customerName: customer.name,
      houseNo: customer.houseNo || "",
      villageNo: customer.villageNo || "",
      customerKey: customer.key || "",
    }));
    setSearchTerm(customer.name);
    setCurrentCustomer(customer);
    setIsDropdownOpen(false);
  };

  const handleAmountChange = (delta: number) => {
    setFormData((prev) => ({
      ...prev,
      amount: Math.max(0, prev.amount + delta),
    }));
  };

  const filteredMonths = THAI_MONTHS.map((month) => ({
    original: month,
    display: `${month}(${paymentType})`,
  })).filter((item) =>
    item.display.toLowerCase().includes(monthSearchTerm.toLowerCase()),
  );

  const selectedAdmin = ADMIN_RECEIVERS.find(
    (r) => r.name === formData.adminReceiver,
  );
  const isCustomerDisabled = !formData.fiscalYear || isLoading;

  // เงื่อนไขปุ่มบันทึก: ต้องกรอกฟอร์มครบ และต้องผ่านการเลือกเดือนใน Modal มาแล้ว (selectedMonth ต้องมีค่า)
  const isFormValid =
    formData.fiscalYear !== "" &&
    formData.customerName !== "" &&
    formData.amount > 0 &&
    formData.adminReceiver !== "" &&
    selectedMonth !== ""; // เพิ่มเงื่อนไขว่าต้องเลือกเดือนแล้ว

  const isModalValid = paymentType !== "" && selectedMonth !== "";

  return (
    <>
      {/* ================= หน้าฟอร์มหลัก ================= */}
      <div className="fixed inset-0 bg-white z-40 flex flex-col h-screen w-full sm:max-w-md mx-auto shadow-xl font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded-full text-gray-500"
            >
              <X size={24} />
            </button>
            <h1 className="text-xl font-medium text-gray-800">
              Subreceive Form
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="px-4 py-1.5 text-sm text-teal-600 hover:bg-teal-50 rounded border border-teal-600 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSave}
              disabled={!isFormValid || isSaving}
              className={`px-4 py-1.5 text-sm text-white rounded shadow-sm transition-colors flex items-center gap-2
                ${isFormValid && !isSaving ? "bg-teal-500 hover:bg-teal-600" : "bg-gray-300 cursor-not-allowed"}
              `}
            >
              {isSaving && <Loader2 className="animate-spin" size={16} />}
              บันทึก
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* 1. วันที่ */}
          <div className="flex flex-col gap-2">
            <label className="text-gray-600 font-medium">วันที่ชำระ</label>
            <input
              type="date"
              value={formData.paymentDate}
              onChange={(e) =>
                setFormData({ ...formData, paymentDate: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* 2. ปีงบ */}
          <div className="flex flex-col gap-2">
            <label className="text-gray-600 font-medium">
              ปีงบประมาณ<span className="text-teal-500 ml-1">*</span>
            </label>
            <div className="relative">
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-700 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={formData.fiscalYear}
                onChange={(e) => {
                  setFormData({ ...formData, fiscalYear: e.target.value });
                  setSearchTerm("");
                  setCurrentCustomer(null);
                  setFormData((prev) => ({
                    ...prev,
                    customerName: "",
                    houseNo: "",
                    villageNo: "",
                  }));
                }}
              >
                <option value="">เลือกปีงบประมาณ</option>
                <option value="2567">2567</option>
                <option value="2568">2568</option>
                <option value="2569">2569</option>
                <option value="2570">2570</option>
              </select>
              <ChevronDown
                className="absolute right-3 top-3.5 text-gray-400 pointer-events-none"
                size={18}
              />
            </div>
          </div>

          {/* 3. ชื่อลูกค้า */}
          <div className="flex flex-col gap-2" ref={dropdownRef}>
            <label
              className={`font-medium ${isCustomerDisabled ? "text-gray-400" : "text-gray-600"}`}
            >
              ชื่อลูกค้า<span className="text-teal-500 ml-1">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={
                  !formData.fiscalYear
                    ? "--- กรุณาเลือกปีงบประมาณก่อน ---"
                    : "พิมพ์ชื่อเพื่อค้นหา..."
                }
                className={`w-full border rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors ${isCustomerDisabled ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed" : "bg-white text-gray-700 border-gray-300"}`}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsDropdownOpen(true);
                  if (e.target.value === "") {
                    setCurrentCustomer(null);
                    setFormData((prev) => ({
                      ...prev,
                      customerName: "",
                      houseNo: "",
                      villageNo: "",
                    }));
                  }
                }}
                onFocus={() => !isCustomerDisabled && setIsDropdownOpen(true)}
                disabled={isCustomerDisabled}
              />
              <div className="absolute right-3 top-3 text-gray-400 pointer-events-none">
                {isDropdownOpen ? (
                  <Search size={18} />
                ) : (
                  <ChevronDown size={18} />
                )}
              </div>
              {isDropdownOpen && !isCustomerDisabled && (
                <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((c, index) => (
                      <li
                        key={index}
                        className="px-4 py-2 hover:bg-teal-50 cursor-pointer text-gray-700 border-b border-gray-100 last:border-0"
                        onClick={() => selectCustomer(c)}
                      >
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-gray-400">
                          บ้านเลขที่ {c.houseNo} หมู่ {c.villageNo}
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="px-4 py-3 text-center text-gray-400">
                      ไม่พบรายชื่อ "{searchTerm}"
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          {/* แสดงที่อยู่ */}
          {formData.customerName && (
            <>
              <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-gray-600 font-medium">
                  บ้านเลขที่<span className="text-teal-500 ml-1">*</span>
                </label>
                <div className="w-full bg-[#5FB0C3] text-white text-center text-lg font-medium py-3 rounded-lg shadow-sm">
                  {formData.houseNo || "-"}
                </div>
              </div>
              <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-4 duration-500">
                <label className="text-gray-600 font-medium">หมู่ที่</label>
                <input
                  type="text"
                  value={formData.villageNo}
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-700 bg-gray-50 focus:outline-none"
                />
              </div>
            </>
          )}

          {/* 4. จำนวนเงิน */}
          <div className="flex flex-col gap-2">
            <label className="text-gray-600 font-medium">
              จำนวนเงิน<span className="text-teal-500 ml-1">*</span>
            </label>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden h-11">
              <input
                type="number"
                value={formData.amount === 0 ? "" : formData.amount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amount:
                      e.target.value === "" ? 0 : parseFloat(e.target.value),
                  })
                }
                placeholder="0"
                className="flex-1 px-3 py-2 text-gray-700 focus:outline-none h-full placeholder-gray-400"
              />
              <div className="flex h-full border-l border-gray-300">
                <button
                  onClick={() => handleAmountChange(-10)}
                  className="px-3 hover:bg-gray-100 active:bg-gray-200 text-gray-600 transition-colors"
                >
                  <Minus size={20} />
                </button>
                <button
                  onClick={() => handleAmountChange(10)}
                  className="px-3 hover:bg-gray-100 active:bg-gray-200 text-gray-600 border-l border-gray-300 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* 5. ผู้รับชำระ */}
          <div className="flex flex-col gap-2">
            <label className="text-gray-600 font-medium">ผู้รับชำระ</label>
            <div className="relative">
              <select
                className="w-full border border-teal-500 rounded-lg px-3 py-2.5 text-gray-700 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
                value={formData.adminReceiver}
                onChange={(e) =>
                  setFormData({ ...formData, adminReceiver: e.target.value })
                }
              >
                <option value="">เลือกเจ้าหน้าที่</option>
                {ADMIN_RECEIVERS.map((admin, index) => (
                  <option key={index} value={admin.name}>
                    {admin.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-3 top-3.5 text-gray-400 pointer-events-none"
                size={18}
              />
            </div>
            <div className="mt-2 h-32 bg-gray-50 border border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden relative">
              {selectedAdmin ? (
                <div className="flex flex-col items-center gap-1">
                  <img
                    src={selectedAdmin.signature}
                    alt={`ลายเซ็น ${selectedAdmin.name}`}
                    className="h-16 w-auto object-contain"
                  />
                  <p className="text-gray-500 text-xs">
                    ลายเซ็นของ{" "}
                    <span className="text-teal-600 font-semibold">
                      {selectedAdmin.name}
                    </span>
                  </p>
                </div>
              ) : (
                <span className="text-gray-400 text-sm">
                  ลายเซ็นจะปรากฏเมื่อเลือกผู้รับชำระ
                </span>
              )}
            </div>
          </div>

          {/* 6. ปุ่มเลือก */}
          <div className="flex flex-col gap-2 pt-2">
            <label className="text-gray-600 font-medium">
              เลือกเดือนที่จะชำระค่าธรรมเนียมขยะ
            </label>
            <button
              onClick={() => setShowModal(true)}
              // ถ้ายังไม่เลือกเดือน (selectedMonth) จะเปลี่ยนสีปุ่มให้ดูว่ายังทำไม่เสร็จ
              className={`w-full font-medium py-3 rounded-lg border transition-colors ${selectedMonth ? "bg-teal-50 border-teal-500 text-teal-700" : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"}`}
            >
              {selectedMonth ? `เลือกแล้ว: ${selectedMonth}` : "เลือก"}
            </button>
          </div>
        </div>
      </div>

      {/* ================= Popup Modal ================= */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full h-[90vh] sm:h-auto sm:max-w-md rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 duration-300">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-full text-gray-500"
                >
                  <X size={24} />
                </button>
                <h2 className="text-xl font-medium text-gray-800">
                  Receivepayment Form
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-1.5 text-sm text-teal-600 hover:bg-teal-50 rounded border border-teal-600 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  disabled={!isModalValid}
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, amount: modalAmount }));
                    setShowModal(false);
                  }}
                  className={`px-4 py-1.5 text-sm text-white rounded shadow-sm transition-colors ${isModalValid ? "bg-teal-500 hover:bg-teal-600" : "bg-gray-300 cursor-not-allowed"}`}
                >
                  บันทึก
                </button>
              </div>
            </div>

            <div className="p-5 space-y-6 overflow-y-auto">
              {/* 1. สถานะการชำระ */}
              <div className="flex flex-col gap-2">
                <label className="text-gray-600 font-medium">
                  สถานะการชำระ<span className="text-teal-500 ml-1">*</span>
                </label>
                <div className="flex flex-col gap-3">
                  {["รับปกติ", "รับชำระลูกหนี้", "รับล่วงหน้า"].map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setPaymentType(type);
                        setSelectedMonth("");
                        setMonthSearchTerm("");
                      }}
                      className={`w-full py-3 rounded-lg border font-medium transition-all ${paymentType === type ? "border-teal-500 bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-500" : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-400"}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. เดือนที่รับชำระ */}
              {paymentType && (
                <div
                  className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300"
                  ref={monthDropdownRef}
                >
                  <label className="text-gray-600 font-medium">
                    เดือนที่รับชำระ<span className="text-teal-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search"
                      className="text-gray-700 w-full border border-teal-500 rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors bg-white shadow-sm"
                      value={selectedMonth || monthSearchTerm}
                      onChange={(e) => {
                        setMonthSearchTerm(e.target.value);
                        setSelectedMonth("");
                        setIsMonthDropdownOpen(true);
                      }}
                      onFocus={() => {
                        setMonthSearchTerm("");
                        setIsMonthDropdownOpen(true);
                      }}
                    />
                    <div className="absolute right-3 top-3 text-gray-400 pointer-events-none">
                      {isMonthDropdownOpen ? (
                        <Search size={18} />
                      ) : selectedMonth ? (
                        <Check size={18} className="text-teal-500" />
                      ) : (
                        <ChevronDown size={18} />
                      )}
                    </div>
                    {isMonthDropdownOpen && (
                      <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredMonths.length > 0 ? (
                          filteredMonths.map((item, index) => (
                            <li
                              key={index}
                              className="px-4 py-3 hover:bg-teal-50 cursor-pointer text-gray-700 border-b border-gray-100 last:border-0"
                              onClick={() => {
                                setSelectedMonth(item.display);
                                setMonthSearchTerm("");
                                setIsMonthDropdownOpen(false);
                              }}
                            >
                              {item.display}
                            </li>
                          ))
                        ) : (
                          <li className="px-4 py-3 text-center text-gray-400">
                            ไม่พบข้อมูล
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* 3. จำนวนเงินที่รับชำระในเดือนนี้ */}
              {selectedMonth && (
                <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-3 duration-500">
                  <label className="text-gray-600 font-medium">
                    จำนวนเงินที่รับชำระในเดือนนี้
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={modalAmount === 0 ? "" : modalAmount}
                      onChange={(e) =>
                        setModalAmount(
                          e.target.value === ""
                            ? 0
                            : parseFloat(e.target.value),
                        )
                      }
                      placeholder="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-3 text-center text-lg font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder-gray-300"
                    />
                    <div className="absolute right-3 top-3 text-gray-400 text-sm pointer-events-none pt-1">
                      บาท
                    </div>
                  </div>
                </div>
              )}

              {/* 4. ชำระยอดของปีงบประมาณ */}
              <div className="flex flex-col gap-2">
                <label className="text-gray-600 font-medium">
                  ชำระยอดของปีงบประมาณ
                </label>
                <div className="relative">
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-700 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    value={modalFiscalYear}
                    onChange={(e) => setModalFiscalYear(e.target.value)}
                  >
                    <option value="">เลือกปีงบประมาณ (ถ้ามี)</option>
                    <option value="2567">2567</option>
                    <option value="2568">2568</option>
                    <option value="2569">2569</option>
                    <option value="2570">2570</option>
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-3.5 text-gray-400 pointer-events-none"
                    size={18}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
