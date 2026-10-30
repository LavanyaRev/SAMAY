import { describe, it, expect } from "vitest";
import {
  getEvcSnapshot,
  confirmEvcPanelAndDate,
  rescheduleEvcCase,
  markEvcVisitDone,
  submitEvcVisitReportAndAdvanceStage,
  STATUTORY_EVC_COMMITTEE_NOTICE_EN,
} from "./evc-client";

describe("Frontend EVC Client & Lifecycle Store", () => {
  it("supports proposing panels with CoI disqualifications, human confirmation, reschedule with reason, visit done, and report upload advancing to SAC_SHC", () => {
    const snap = getEvcSnapshot();
    expect(snap.cases.length).toBeGreaterThanOrEqual(6);

    const c1 = snap.cases[0];
    expect(c1.rejectedExperts.length).toBe(3);

    // 1. Confirm panel & date
    const scheduled = confirmEvcPanelAndDate(
      c1.id,
      c1.proposedPanels[0].id,
      "2026-05-14",
      "REGIONAL_OFFICER",
    );
    expect(scheduled?.status).toBe("SCHEDULED");
    expect(scheduled?.schedulingDueStatus).toBe("CLOSED");

    // 2. Reschedule with mandatory reason
    const rescheduled = rescheduleEvcCase(
      c1.id,
      "2026-05-16",
      "University examination schedule adjustment",
      "REGIONAL_OFFICER",
    );
    expect(rescheduled?.scheduledDate).toBe("2026-05-16");
    expect(rescheduled?.rescheduleHistory.length).toBe(1);

    // 3. Mark visit done
    const visited = markEvcVisitDone(c1.id);
    expect(visited?.status).toBe("VISIT_DONE");

    // 4. Upload report & automatically advance committee stage
    const completed = submitEvcVisitReportAndAdvanceStage(c1.id, {
      reportFileId: "DOC-EVC-REPORT-001.pdf",
      summary: "All labs verified.",
      observations: ["120 GPU nodes verified"],
    });
    expect(completed?.status).toBe("REPORT_ACCEPTED");
    expect(completed?.workflowStage).toBe("SAC_SHC");
    expect(completed?.visitReport?.statutoryNotice).toBe(
      STATUTORY_EVC_COMMITTEE_NOTICE_EN,
    );
  });
});

