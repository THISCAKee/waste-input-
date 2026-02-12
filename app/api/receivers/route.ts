import { NextResponse } from "next/server";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export async function GET() {
  try {
    if (
      !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      !process.env.GOOGLE_PRIVATE_KEY ||
      !process.env.GOOGLE_SHEET_ID
    ) {
      return NextResponse.json(
        { error: "Missing environment variables" },
        { status: 500 },
      );
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

    // ดึงข้อมูลจากแผ่น customer เพื่อหารายชื่อลูกค้า
    const sheet = doc.sheetsByTitle["customer"];
    if (!sheet) {
      throw new Error('Sheet "customer" not found');
    }

    const rows = await sheet.getRows();
    const uniqueMap = new Map();

    rows.forEach((row) => {
      const name = row.get("ชื่อ-สกุล/บริษัท");
      if (!name) return;

      const cleanName = name.trim();
      const houseNo = (row.get("บ้านเลขที่") || "-").trim();
      const villageNo = (row.get("หมู่ที่") || "-").trim();
      const customerKey = (row.get("key") || "").trim();

      const rawAmount = row.get("อัตรา/เดือน");
      const amount = rawAmount ? parseFloat(rawAmount.replace(/,/g, "")) : 0;

      const uniqueKey = `${cleanName}_${houseNo}_${villageNo}`;

      if (!uniqueMap.has(uniqueKey)) {
        uniqueMap.set(uniqueKey, {
          name: cleanName,
          houseNo: houseNo,
          villageNo: villageNo,
          defaultAmount: amount || 0,
          key: customerKey,
        });
      }
    });

    const receiversData = Array.from(uniqueMap.values());
    return NextResponse.json({ receivers: receiversData });
  } catch (error) {
    console.error("Sheet Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 },
    );
  }
}
