import { NextResponse } from "next/server";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      paymentDate,
      fiscalYear,
      customerName,
      houseNo,
      villageNo,
      amount,
      adminReceiver,
      selectedMonth,
      modalFiscalYear,
      paymentType,
      customerKey,
    } = body;

    console.log("🚀 Saving Payment:", body);

    // 1. แปลงวันที่เป็น พ.ศ. (DD/MM/YYYY)
    let formattedDate = paymentDate;
    if (paymentDate && paymentDate.includes("-")) {
      const [year, month, day] = paymentDate.split("-");
      formattedDate = `${day}/${month}/${parseInt(year) + 543}`;
    }

    // 2. เชื่อมต่อ Google Sheet
    if (
      !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      !process.env.GOOGLE_PRIVATE_KEY ||
      !process.env.GOOGLE_SHEET_ID
    ) {
      return NextResponse.json({ error: "Config missing" }, { status: 500 });
    }

    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(
      process.env.GOOGLE_SHEET_ID,
      serviceAccountAuth,
    );
    await doc.loadInfo();

    // 3. เลือก Sheet จาก GID
    const sheet = doc.sheetsById[1969954315];
    if (!sheet) {
      console.error(
        "Available Sheets:",
        doc.sheetsByIndex.map((s: any) => `${s.title} (GID: ${s.sheetId})`),
      );
      throw new Error("Target Sheet (GID: 1969954315) not found");
    }

    const sheetTitle = sheet.title;

    console.log("📋 Sheet title:", sheetTitle);

    // 4. หาแถวสุดท้ายที่มีข้อมูลจริง (ใช้คอลัมน์ G "ชื่อลูกค้า" เป็นตัวตรวจสอบ)
    //    เหตุผล: คอลัมน์สูตร (A-C, F, N-Q) มี ARRAYFORMULA ที่ขยายไป ~25,000+ แถว
    //    ทำให้ addRow() เดิม append ข้อมูลไปยังแถวท้ายสุดของ Sheet แทนที่จะอยู่ต่อจากข้อมูลจริง
    //    วิธีนี้: อ่านคอลัมน์ G ผ่าน Sheets API (GET ใช้ได้ปกติ) เพื่อหาแถวสุดท้ายที่มีชื่อลูกค้า
    const authHeaders = await serviceAccountAuth.getRequestHeaders();
    const sheetId = process.env.GOOGLE_SHEET_ID;

    const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(`'${sheetTitle}'!G:G`)}`;
    const getRes = await fetch(getUrl, { headers: authHeaders });

    if (!getRes.ok) {
      throw new Error(`Failed to read sheet: ${getRes.statusText}`);
    }

    const getData = await getRes.json();
    const allGValues = getData.values || [];

    // Google Sheets API คืนค่าจนถึงแถวสุดท้ายที่มีข้อมูลในคอลัมน์ G
    // allGValues.length = แถวสุดท้ายที่มีชื่อลูกค้า (1-indexed, รวม header)
    const lastDataRow = allGValues.length;
    const targetRow = lastDataRow + 1; // แถวถัดไป (1-indexed)

    console.log(`📍 Last row with customer data (col G): ${lastDataRow}`);
    console.log(`📍 Writing new data to row: ${targetRow}`);

    // 5. เขียนข้อมูลลงแถวที่ถูกต้องผ่าน google-spreadsheet (cell-based)
    //    ใช้ loadCells + saveUpdatedCells ซึ่ง library จัดการ auth ให้เอง
    //
    //    Layout ของ Sheet:
    //    A(0): key (สูตร)        B(1): key_subreceive (สูตร)  C(2): key_Receive (ข้อมูล)
    //    D(3): วันที่ชำระ         E(4): ปีงบประมาณ             F(5): keyลูกค้า (ข้อมูล)
    //    G(6): ชื่อลูกค้า         H(7): บ้านเลขที่              I(8): หมู่ที่
    //    J(9): สถานะการชำระ     K(10): เดือนที่รับชำระ         L(11): จำนวนเงิน
    //    M(12): ชำระของปี       N(13): วันที่ (สูตร)           O(14)-Q(16): สูตร

    // โหลดเซลล์ที่ต้องเขียน (แถวเดียว, คอลัมน์ C-M)
    await sheet.loadCells({
      startRowIndex: targetRow - 1, // 0-indexed
      endRowIndex: targetRow, // exclusive
      startColumnIndex: 2, // C (0-indexed) — สำหรับ key_Receive
      endColumnIndex: 13, // M+1 (exclusive, 0-indexed)
    });

    // คำนวณ key_Receive = keyลูกค้า + เดือนที่ชำระ + ปีที่ชำระ
    const paymentYear = modalFiscalYear || fiscalYear;
    const keyReceive = `${customerKey || ""}${selectedMonth || ""}${paymentYear || ""}`;

    // กำหนดค่าเฉพาะคอลัมน์ข้อมูล
    const cellData = [
      { col: 2, value: keyReceive }, // C: key_Receive
      { col: 3, value: formattedDate }, // D: วันที่ชำระ
      { col: 4, value: fiscalYear }, // E: ปีงบประมาณ
      { col: 5, value: customerKey || "" }, // F: keyลูกค้า
      { col: 6, value: customerName }, // G: ชื่อลูกค้า
      { col: 7, value: houseNo }, // H: บ้านเลขที่
      { col: 8, value: villageNo }, // I: หมู่ที่
      { col: 9, value: paymentType }, // J: สถานะการชำระ
      { col: 10, value: selectedMonth }, // K: เดือนที่รับชำระ
      { col: 11, value: amount }, // L: จำนวนเงิน
      { col: 12, value: paymentYear }, // M: ชำระของปี
    ];

    const rowIndex = targetRow - 1; // getCell ใช้ 0-indexed
    for (const { col, value } of cellData) {
      const cell = sheet.getCell(rowIndex, col);
      cell.value = value;
    }

    // บันทึกเซลล์ที่แก้ไขทั้งหมดในครั้งเดียว
    await sheet.saveUpdatedCells();

    console.log(`✅ Data written to row ${targetRow} successfully!`);

    return NextResponse.json({
      success: true,
      rowNumber: targetRow,
    });
  } catch (error: any) {
    console.error("🔥 Save Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save data" },
      { status: 500 },
    );
  }
}
