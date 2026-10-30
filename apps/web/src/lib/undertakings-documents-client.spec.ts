import { describe, it, expect } from "vitest";
import {
  getUndertakingsDocumentsSnapshot,
  submitEvidenceForConditionInStore,
  reviewConditionInStore,
  waiveConditionInStore,
  submitRenewalInStore,
  verifyRenewalInStore,
  importCsvDocumentsInStore,
} from "./undertakings-documents-client";

describe("Frontend Undertakings & Tracked Documents Store", () => {
  it("enforces RBAC (institutions cannot verify their own evidence or renewals), supports resubmission history, waiver, renewal promotion, and idempotent CSV import", () => {
    const snap = getUndertakingsDocumentsSnapshot();
    const cond = snap.conditions[0];

    // Institution cannot review its own evidence
    expect(() =>
      reviewConditionInStore(cond.id, {
        decision: "ACCEPT",
        actorRole: "INSTITUTION",
      }),
    ).toThrow(/Institutions cannot verify/);

    // Institution resubmits complete evidence
    submitEvidenceForConditionInStore(cond.id, {
      providedEvidenceTypes: cond.requiredEvidenceTypes,
      remarks: "Uploaded complete evidence.",
    });

    const verified = reviewConditionInStore(cond.id, {
      decision: "ACCEPT",
      actorRole: "REGIONAL_OFFICER",
      reason: "Verified.",
    });
    expect(verified.status).toBe("VERIFIED");

    // Competent authority waives second condition
    const waived = waiveConditionInStore(snap.conditions[1].id, {
      actorRole: "BUREAU_OFFICER",
      waiverReason: "Waived by Competent Authority.",
    });
    expect(waived.status).toBe("WAIVED_BY_AUTHORITY");

    // Document renewal + verification promotes version and preserves history
    const doc = snap.documents[1];
    submitRenewalInStore(doc.id, {
      newReference: "LAND-COEP-2026-0104-REN",
      newValidFrom: "2026-07-10",
      newExpiryDate: "2036-07-10",
      remarks: "Renewed title.",
    });

    expect(() =>
      verifyRenewalInStore(doc.id, {
        decision: "ACCEPT",
        actorRole: "INSTITUTION",
      }),
    ).toThrow(/Institutions cannot verify/);

    const promoted = verifyRenewalInStore(doc.id, {
      decision: "ACCEPT",
      actorRole: "REGIONAL_OFFICER",
    });
    expect(promoted.status).toBe("RENEWAL_VERIFIED");
    expect(promoted.version).toBe(3);
    expect(promoted.versionHistory.length).toBe(2);

    // Idempotent CSV bulk import
    const csv = [
      "institution_id,institution_name,region,type,reference,valid_from,expiry_date",
      "inst-csv-1,CSV Tech Institute,WRO,LEASE,LEASE-CSV-001,2022-01-01,2026-08-01",
      "inst-csv-bad,Bad Row,WRO,BAD_TYPE,REF-1,2026-08-01,2021-01-01",
    ].join("\n");

    const dry = importCsvDocumentsInStore(csv, true);
    expect(dry.validRowsCount).toBe(1);
    expect(dry.errorRowsCount).toBe(1);
    expect(dry.createdCount).toBe(0);

    const run1 = importCsvDocumentsInStore(csv, false);
    expect(run1.createdCount).toBe(1);

    const run2 = importCsvDocumentsInStore(csv, false);
    expect(run2.createdCount).toBe(0);
    expect(run2.skippedIdempotentCount).toBe(1);
  });
});

