# 📋 Waste Input Project - Code Review Report

**Date:** February 6, 2026  
**Project:** waste-input (Subreceive Form Application)

---

## 📊 Overview
Next.js application for collecting waste payment data and storing it in Google Sheets. Uses TypeScript, React, and Tailwind CSS.

---

## 🔴 Critical Issues

### 1. Missing `alt` Attribute on Image Tag
**File:** [app/SubreceiveForm.tsx](app/SubreceiveForm.tsx#L463)  
**Issue:** Accessibility violation - img element missing alt text
```tsx
<img src={selectedAdmin.signature} /> // ❌ Missing alt
```
**Impact:** Screen readers can't describe the image; fails WCAG accessibility standards
**Fix:** Add descriptive alt text

---

## ⚠️ High Priority Issues

### 2. No Input Validation in POST Endpoints
**Files:** 
- [app/api/receivers/route.ts](app/api/receivers/route.ts#L90)
- Currently validates env variables but NOT request body

**Missing Validations:**
- Empty/null values in required fields
- Invalid data types (e.g., string instead of number for amount)
- SQL injection prevention (sanitization)
- Request payload size limits
- Data consistency checks

**Risk:** Invalid data could corrupt Google Sheet data

---

### 3. Type Safety Issues

#### Missing TypeScript Interfaces
No type definitions for API request/response bodies. Example from SubreceiveForm.tsx (line 315):
```tsx
const payload = {
  customerName: formData.customerName,
  houseNo: formData.houseNo,
  villageNo: formData.villageNo,
  // ... 6 more fields
};
// No interface defining PaymentPayload
```

**Impact:** 
- Runtime errors if field names mismatch
- Harder to maintain code
- No IntelliSense support

---

### 4. Unsafe Date Handling
**File:** [app/api/receivers/route.ts](app/api/receivers/route.ts#L138)
```typescript
"วันที่ชำระ": body.paymentDate || new Date().toISOString(), // ❌ ISO format for Thai app
```
**Issue:** Uses ISO format (2026-02-06T00:00:00Z) but app is Thai - inconsistent with user's date picker
**Better:** Convert to Thai date format or consistent format

---

## 📝 Medium Priority Issues

### 5. Error Messages Expose Internal Details
**File:** [app/api/receivers/route.ts](app/api/receivers/route.ts#L146)
```typescript
console.error("POST Sheet Error:", error);
return NextResponse.json({ error: "Failed to append data" }, { status: 500 });
```
**Issue:** Full error logs to console - may expose sensitive info in production
**Better:** Log errors securely; return generic messages to client in production

---

### 6. Missing Error Handling in Frontend
**File:** [app/SubreceiveForm.tsx](app/SubreceiveForm.tsx#L321)
- No retry mechanism after failed submission
- No user feedback on specific error types
- One generic alert covers all error cases

---

### 7. Hardcoded Values in Component
**File:** [app/SubreceiveForm.tsx](app/SubreceiveForm.tsx#L10-12)
```tsx
const ADMIN_RECEIVERS = [
  { name: "นางขนิฎฐา แสงการ", signature: "/Signatures/signature-1.png" },
  { name: "นางสาวอัจฉราพรรณ คำสร้อย", signature: "/Signatures/signature-2.png" },
];
```
**Better:** Fetch from API or config file instead of hardcoding

---

### 8. Unused `submit-payment` Endpoint
**File:** [app/api/submit-payment/route.ts](app/api/submit-payment/route.ts)
- Exists but is NOT called from frontend
- Frontend uses `/api/receivers` POST instead
- Creates code redundancy/confusion

**Action:** Either use it or delete it

---

## ✅ Strengths

- ✓ **Proper Google Sheets Authentication:** JWT setup is correct (using google-auth-library)
- ✓ **Deduplication Logic:** Smart duplicate removal using uniqueKey in GET handler
- ✓ **Environment Variables:** Properly secured in .env.local
- ✓ **UI/UX Design:** Clean, responsive interface with good accessibility (except image alt)
- ✓ **Loading States:** Shows loading and submitting states to users
- ✓ **Responsive Design:** Works on mobile and desktop
- ✓ **Thai Localization:** Good Thai language support throughout

---

## 🔧 Recommended Fixes (Priority Order)

### Priority 1 (Critical)
- [ ] Add `alt` attribute to img tag
- [ ] Add input validation to POST handlers
- [ ] Create TypeScript interfaces for API payloads

### Priority 2 (High)
- [ ] Fix date format for Thai locale
- [ ] Improve error handling and logging
- [ ] Remove or properly use `submit-payment` endpoint

### Priority 3 (Medium)
- [ ] Move hardcoded admin receivers to API/config
- [ ] Add request size limits
- [ ] Implement better error feedback in UI
- [ ] Add data sanitization/escape functions

### Priority 4 (Polish)
- [ ] Update page metadata in layout.tsx
- [ ] Add loading skeleton for initial data fetch
- [ ] Implement form auto-save to localStorage
- [ ] Add success/error toast notifications

---

## 📦 Dependencies Status
| Package | Version | Status |
|---------|---------|--------|
| next | 16.1.1 | ✓ Current |
| react | 19.2.3 | ✓ Current |
| google-spreadsheet | 5.0.2 | ✓ Current |
| google-auth-library | 10.5.0 | ✓ Current |
| tailwindcss | ^4 | ✓ Current |

All dependencies are up to date!

---

## 📝 Next Steps

1. Run: `npm run lint` to check for additional issues
2. Implement Priority 1 fixes
3. Test all data entry scenarios
4. Set up proper error monitoring (e.g., Sentry)
5. Deploy to staging for user testing

---

**Review Completed By:** Code Review Agent  
**Status:** Ready for Development
