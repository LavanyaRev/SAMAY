export type Locale = 'en' | 'hi';

export interface TranslationDictionary {
  portalName: string;
  portalSubtitle: string;
  aicteCouncil: string;
  academicCycle: string;
  searchPlaceholder: string;
  commandPaletteHint: string;
  notifications: string;
  markAllRead: string;
  languageToggleLabel: string;
  themeLight: string;
  themeDark: string;
  signOut: string;
  signIn: string;
  signingIn: string;
  emailLabel: string;
  passwordLabel: string;
  demoAccountsTitle: string;
  jurisdictionLabel: string;
  panIndiaHq: string;
  advisoryLabel: string;
  advisoryVerifyNotice: string;
  auditVerifiedSeal: string;
  auditLedgerHash: string;
  confirmActionTitle: string;
  mandatoryReasonLabel: string;
  mandatoryReasonPlaceholder: string;
  mandatoryReasonHelper: string;
  cancel: string;
  confirmSubmit: string;
  exportCsv: string;
  columnsToggle: string;
  filterPlaceholder: string;
  allStatuses: string;
  showingRows: string;
  previousPage: string;
  nextPage: string;
  emptyStateDefaultTitle: string;
  emptyStateDefaultDesc: string;
  fileDropzonePrompt: string;
  fileDropzoneConstraints: string;
  nav: {
    overview: string;
    applications: string;
    scrutinyQueue: string;
    evcScheduling: string;
    undertakings: string;
    trackedDocuments: string;
    regionalPendency: string;
    auditLedger: string;
    systemSettings: string;
    componentGallery: string;
  };
  roles: {
    INSTITUTION: string;
    REGIONAL_OFFICER: string;
    BUREAU_OFFICER: string;
    COMMITTEE_MEMBER: string;
    ADMIN: string;
  };
  statuses: {
    DRAFT: string;
    SUBMITTED: string;
    UNDER_SCRUTINY: string;
    SCRUTINY_DEFICIENT: string;
    SCRUTINY_VERIFIED: string;
    EVC_SCHEDULED: string;
    EVC_IN_PROGRESS: string;
    EVC_COMPLETED: string;
    SAC_HEARING_SCHEDULED: string;
    SAC_RECOMMENDED: string;
    APPROVED: string;
    REJECTED: string;
    PENDING: string;
    VERIFIED: string;
    OVERDUE: string;
    WAIVED_BY_AUTHORITY: string;
  };
  sla: {
    ON_TRACK: string;
    DUE_SOON: string;
    OVERDUE: string;
    PAUSED: string;
  };
  landing: {
    INSTITUTION: {
      title: string;
      subtitle: string;
      tableTitle: string;
      undertakingsTitle: string;
      documentsTitle: string;
      timelineTitle: string;
      primaryAction: string;
    };
    REGIONAL_OFFICER: {
      title: string;
      subtitle: string;
      tableTitle: string;
      primaryAction: string;
    };
    BUREAU_OFFICER: {
      title: string;
      subtitle: string;
      tableTitle: string;
      regionalMatrixTitle: string;
      primaryAction: string;
    };
    COMMITTEE_MEMBER: {
      title: string;
      subtitle: string;
      tableTitle: string;
      checklistTitle: string;
      primaryAction: string;
    };
    ADMIN: {
      title: string;
      subtitle: string;
      tableTitle: string;
      pipelineTitle: string;
      primaryAction: string;
    };
  };
  tableHeaders: {
    applicationId: string;
    aicteId: string;
    institutionName: string;
    region: string;
    stateCity: string;
    programType: string;
    stage: string;
    status: string;
    slaStatus: string;
    submittedOn: string;
    actions: string;
    conditionType: string;
    dueDate: string;
    evidenceType: string;
    documentType: string;
    documentNo: string;
    expiryDate: string;
  };
}

export const TRANSLATIONS: Record<Locale, TranslationDictionary> = {
  en: {
    portalName: 'SAMAY Statutory Portal',
    portalSubtitle: 'Smart AICTE Monitoring & Approval Yojana',
    aicteCouncil: 'All India Council for Technical Education (AICTE)',
    academicCycle: 'Approval Process Cycle AY 2026-27',
    searchPlaceholder: 'Search applications, AICTE ID (1-3948...), or institution...',
    commandPaletteHint: 'Ctrl+K',
    notifications: 'Statutory Alerts & Escalations',
    markAllRead: 'Acknowledge All',
    languageToggleLabel: 'हिन्दी',
    themeLight: 'Light',
    themeDark: 'Dark',
    signOut: 'Sign Out',
    signIn: 'Authenticate & Enter Portal',
    signingIn: 'Verifying Statutory Credentials...',
    emailLabel: 'Official Email Address',
    passwordLabel: 'Password',
    demoAccountsTitle: 'Seeded Statutory Role Credentials (Click to Fill)',
    jurisdictionLabel: 'Jurisdiction',
    panIndiaHq: 'Pan-India HQ (New Delhi)',
    advisoryLabel: 'ADVISORY',
    advisoryVerifyNotice: 'AI suggestion, verify before use',
    auditVerifiedSeal: 'AUDIT LEDGER VERIFIED',
    auditLedgerHash: 'Immutable Tx Ledger',
    confirmActionTitle: 'Record Statutory Authority Action',
    mandatoryReasonLabel: 'Mandatory Statutory Rationale / Speaking Order Note',
    mandatoryReasonPlaceholder:
      'Cite relevant APH 2024-27 verification findings, deficiency details, or inspection observations (minimum 15 characters)...',
    mandatoryReasonHelper:
      'Human Supremacy Safeguard: Every state transition requires an explicit, auditable human rationale.',
    cancel: 'Cancel',
    confirmSubmit: 'Sign & Commit Transition',
    exportCsv: 'Export CSV',
    columnsToggle: 'Columns',
    filterPlaceholder: 'Filter by institution, ID, or state...',
    allStatuses: 'All Statuses',
    showingRows: 'Showing rows',
    previousPage: 'Previous',
    nextPage: 'Next',
    emptyStateDefaultTitle: 'No Statutory Records Match Active Filter',
    emptyStateDefaultDesc:
      'Adjust your status filter, regional scope, or search query to inspect matching institutional dossiers.',
    fileDropzonePrompt: 'Select or drag-and-drop notarized PDF affidavit / statutory evidence',
    fileDropzoneConstraints: 'PDF/A only • Max 10 MB • SHA-256 checksum & ClamAV antivirus scan enforced',
    nav: {
      overview: 'Role Workspace',
      applications: 'Applications Register',
      scrutinyQueue: 'Scrutiny Docket',
      evcScheduling: 'EVC Inspections',
      undertakings: 'Undertakings & Conditions',
      trackedDocuments: 'Document Validity',
      regionalPendency: 'Regional Pendency',
      auditLedger: 'Immutable Audit Log',
      systemSettings: 'Pipeline & SLA Governance',
      componentGallery: 'Design System Gallery',
    },
    roles: {
      INSTITUTION: 'Institution Principal / Nodal Officer',
      REGIONAL_OFFICER: 'Regional Officer (RO)',
      BUREAU_OFFICER: 'Approval Bureau Officer (HQ)',
      COMMITTEE_MEMBER: 'Scrutiny / EVC Committee Member',
      ADMIN: 'System & Regulatory Administrator',
    },
    statuses: {
      DRAFT: 'Draft Dossier',
      SUBMITTED: 'Submitted',
      UNDER_SCRUTINY: 'Under Scrutiny',
      SCRUTINY_DEFICIENT: 'Scrutiny Deficient',
      SCRUTINY_VERIFIED: 'Scrutiny Verified',
      EVC_SCHEDULED: 'EVC Scheduled',
      EVC_IN_PROGRESS: 'EVC In Progress',
      EVC_COMPLETED: 'EVC Completed',
      SAC_HEARING_SCHEDULED: 'SAC/SHC Hearing',
      SAC_RECOMMENDED: 'SAC Recommended',
      APPROVED: 'EoA / LoA Approved',
      REJECTED: 'Rejected',
      PENDING: 'Pending Rectification',
      VERIFIED: 'Verified & Closed',
      OVERDUE: 'Overdue Breach',
      WAIVED_BY_AUTHORITY: 'Waived by Authority',
    },
    sla: {
      ON_TRACK: 'On Track',
      DUE_SOON: 'Due Soon',
      OVERDUE: 'Overdue',
      PAUSED: 'SLA Paused',
    },
    landing: {
      INSTITUTION: {
        title: 'Institutional Compliance & Approval Dossier',
        subtitle:
          'Walchand College of Engineering, Sangli (AICTE Permanent ID: 1-2000000001 • Western Region WRO)',
        tableTitle: 'Submitted Approval Applications (AY 2026-27)',
        undertakingsTitle: 'Time-Bound Undertakings & Conditional Affidavits',
        documentsTitle: 'Tracked Statutory Documents (Lease Deeds, Fire NOC, FDR)',
        timelineTitle: 'Statutory Evaluation Rail (APP-2026-WRO-00104)',
        primaryAction: 'Upload Rectification Affidavit',
      },
      REGIONAL_OFFICER: {
        title: 'Western Regional Office (WRO) Jurisdiction Workbench',
        subtitle:
          'Statutory Scrutiny Allocation, EVC Coordination & Regional Pendency Monitoring (Maharashtra, Gujarat, Goa)',
        tableTitle: 'WRO Regional Application Pendency Register',
        primaryAction: 'Allocate Scrutiny Panel',
      },
      BUREAU_OFFICER: {
        title: 'Pan-India Approval Bureau Command Center',
        subtitle:
          'National Pendency Oversight, SAC/SHC Appellate Recommendations & Competent Authority Sign-Off',
        tableTitle: 'Applications Awaiting Bureau Review & Competent Authority Decision',
        regionalMatrixTitle: 'Inter-Regional Pendency & SLA Breach Ledger',
        primaryAction: 'Record Competent Authority Decision',
      },
      COMMITTEE_MEMBER: {
        title: 'Statutory Scrutiny & EVC Inspection Docket',
        subtitle:
          'Assigned Institutional Dossiers, Documentary Verification Checklists & EVC Field Reports',
        tableTitle: 'Assigned Committee Evaluation Cases',
        checklistTitle: 'Statutory Verification Checklist (APP-2026-WRO-00104)',
        primaryAction: 'Submit Signed Inspection Report',
      },
      ADMIN: {
        title: 'Regulatory Pipeline & Audit Governance Console',
        subtitle:
          'Versioned APH 2024-27 Workflow Schemas, SLA Escalation Policies & Immutable Transactional Audit Ledger',
        tableTitle: 'Immutable Transactional Audit Ledger',
        pipelineTitle: 'Versioned Pipeline Definitions (Workflow-as-Data)',
        primaryAction: 'Verify Audit Ledger Integrity',
      },
    },
    tableHeaders: {
      applicationId: 'Application Ref',
      aicteId: 'AICTE Perm ID',
      institutionName: 'Institution Name',
      region: 'Region',
      stateCity: 'State / District',
      programType: 'Program Stream',
      stage: 'Statutory Stage',
      status: 'Current Status',
      slaStatus: 'SLA Clock',
      submittedOn: 'Submitted Date',
      actions: 'Action',
      conditionType: 'Condition Category',
      dueDate: 'Compliance Due',
      evidenceType: 'Required Evidence',
      documentType: 'Statutory Document',
      documentNo: 'Instrument / Reg No.',
      expiryDate: 'Validity Expiry',
    },
  },
  hi: {
    portalName: 'समय (SAMAY) वैधानिक पोर्टल',
    portalSubtitle: 'स्मार्ट एआईसीटीई निगरानी एवं अनुमोदन योजना (Smart AICTE Monitoring & Approval Yojana)',
    aicteCouncil: 'अखिल भारतीय तकनीकी शिक्षा परिषद (AICTE)',
    academicCycle: 'अनुमोदन प्रक्रिया चक्र शैक्षणिक वर्ष 2026-27',
    searchPlaceholder: 'आवेदन संख्या, एआईसीटीई आईडी (1-3948...), या संस्थान खोजें...',
    commandPaletteHint: 'Ctrl+K',
    notifications: 'वैधानिक सूचनाएं और समय-सीमा वृद्धि',
    markAllRead: 'सभी स्वीकार करें',
    languageToggleLabel: 'English',
    themeLight: 'हल्का (Light)',
    themeDark: 'गहरा (Dark)',
    signOut: 'लॉग आउट करें',
    signIn: 'प्रमाणित करें और पोर्टल में प्रवेश करें',
    signingIn: 'वैधानिक प्रमाण-पत्र सत्यापित हो रहे हैं...',
    emailLabel: 'आधिकारिक ईमेल पता',
    passwordLabel: 'पासवर्ड',
    demoAccountsTitle: 'सीडेड वैधानिक भूमिका खाते (भरने के लिए क्लिक करें)',
    jurisdictionLabel: 'अधिकार-क्षेत्र',
    panIndiaHq: 'अखिल भारतीय मुख्यालय (नई दिल्ली)',
    advisoryLabel: 'ADVISORY (परामर्श)',
    advisoryVerifyNotice: 'एआई सुझाव, उपयोग से पहले सत्यापित करें',
    auditVerifiedSeal: 'लेखापरीक्षा खाता सत्यापित',
    auditLedgerHash: 'अपरिवर्तनीय लेनदेन हैश',
    confirmActionTitle: 'वैधानिक प्राधिकरण निर्णय दर्ज करें',
    mandatoryReasonLabel: 'अनिवार्य वैधानिक तर्क / आदेश टिप्पणी',
    mandatoryReasonPlaceholder:
      'प्रासंगिक APH 2024-27 सत्यापन निष्कर्ष, कमी का विवरण, या निरीक्षण अवलोकन दर्ज करें (न्यूनतम 15 अक्षर)...',
    mandatoryReasonHelper:
      'मानवीय सर्वोच्चता सुरक्षा: प्रत्येक स्थिति परिवर्तन के लिए स्पष्ट मानवीय तर्क अनिवार्य है।',
    cancel: 'रद्द करें',
    confirmSubmit: 'हस्ताक्षर करें और परिवर्तन सहेजें',
    exportCsv: 'CSV निर्यात करें',
    columnsToggle: 'स्तंभ (Columns)',
    filterPlaceholder: 'संस्थान, आईडी या राज्य द्वारा फ़िल्टर करें...',
    allStatuses: 'सभी स्थितियाँ',
    showingRows: 'पंक्तियाँ प्रदर्शित हैं',
    previousPage: 'पिछला',
    nextPage: 'अगला',
    emptyStateDefaultTitle: 'सक्रिय फ़िल्टर से कोई वैधानिक रिकॉर्ड मेल नहीं खाता',
    emptyStateDefaultDesc:
      'संबंधित संस्थागत फ़ाइलों का निरीक्षण करने के लिए अपनी स्थिति फ़िल्टर या खोज बदलें।',
    fileDropzonePrompt: 'नोटरीकृत पीडीएफ शपथ-पत्र / वैधानिक साक्ष्य चुनें या यहाँ छोड़ें',
    fileDropzoneConstraints: 'केवल PDF/A • अधिकतम 10 MB • SHA-256 चेकसम और ClamAV जांच अनिवार्य',
    nav: {
      overview: 'मुख्य कार्यपटल',
      applications: 'आवेदन पंजिका',
      scrutinyQueue: 'स्क्रूटनी सूची',
      evcScheduling: 'ईवीसी निरीक्षण',
      undertakings: 'शपथ-पत्र एवं शर्तें',
      trackedDocuments: 'दस्तावेज़ वैधता',
      regionalPendency: 'क्षेत्रीय लंबित मामले',
      auditLedger: 'अपरिवर्तनीय ऑडिट लॉग',
      systemSettings: 'पाइपलाइन एवं नियम प्रबंधन',
      componentGallery: 'डिज़ाइन सिस्टम गैलरी',
    },
    roles: {
      INSTITUTION: 'संस्थान प्राचार्य / नोडल अधिकारी',
      REGIONAL_OFFICER: 'क्षेत्रीय अधिकारी (RO)',
      BUREAU_OFFICER: 'अनुमोदन ब्यूरो अधिकारी (मुख्यालय)',
      COMMITTEE_MEMBER: 'स्क्रूटनी / ईवीसी समिति सदस्य',
      ADMIN: 'प्रणाली एवं नियामक प्रशासक',
    },
    statuses: {
      DRAFT: 'प्रारूप (Draft)',
      SUBMITTED: 'प्रस्तुत (Submitted)',
      UNDER_SCRUTINY: 'स्क्रूटनी अधीन',
      SCRUTINY_DEFICIENT: 'स्क्रूटनी में कमी',
      SCRUTINY_VERIFIED: 'स्क्रूटनी सत्यापित',
      EVC_SCHEDULED: 'ईवीसी निर्धारित',
      EVC_IN_PROGRESS: 'ईवीसी प्रगति पर',
      EVC_COMPLETED: 'ईवीसी पूर्ण',
      SAC_HEARING_SCHEDULED: 'एसएसी/एसएचसी सुनवाई',
      SAC_RECOMMENDED: 'एसएसी अनुशंसित',
      APPROVED: 'अनुमोदित (Approved)',
      REJECTED: 'अस्वीकृत (Rejected)',
      PENDING: 'सुधार लंबित',
      VERIFIED: 'सत्यापित एवं बंद',
      OVERDUE: 'समय-सीमा उल्लंघन',
      WAIVED_BY_AUTHORITY: 'प्राधिकरण द्वारा छूट',
    },
    sla: {
      ON_TRACK: 'समय पर (On Track)',
      DUE_SOON: 'शीघ्र देय (Due Soon)',
      OVERDUE: 'अतिदेय (Overdue)',
      PAUSED: 'समय-घड़ी रुकी (Paused)',
    },
    landing: {
      INSTITUTION: {
        title: 'संस्थागत अनुपालन एवं अनुमोदन फ़ाइल',
        subtitle:
          'वालचंद कॉलेज ऑफ इंजीनियरिंग, सांगली (स्थायी आईडी: 1-2000000001 • पश्चिमी क्षेत्र WRO)',
        tableTitle: 'प्रस्तुत अनुमोदन आवेदन (शैक्षणिक वर्ष 2026-27)',
        undertakingsTitle: 'समयबद्ध वचनबद्धताएं एवं सशर्त शपथ-पत्र',
        documentsTitle: 'वैधानिक दस्तावेज़ वैधता (भूमि पट्टा, अग्नि एनओसी, एफडीआर)',
        timelineTitle: 'वैधानिक मूल्यांकन समय-रेखा (APP-2026-WRO-00104)',
        primaryAction: 'सुधार शपथ-पत्र अपलोड करें',
      },
      REGIONAL_OFFICER: {
        title: 'पश्चिमी क्षेत्रीय कार्यालय (WRO) अधिकार-क्षेत्र कार्यपटल',
        subtitle:
          'वैधानिक स्क्रूटनी आवंटन, ईवीसी समन्वय एवं क्षेत्रीय लंबित निगरानी (महाराष्ट्र, गुजरात, गोवा)',
        tableTitle: 'WRO क्षेत्रीय आवेदन लंबित पंजिका',
        primaryAction: 'स्क्रूटनी पैनल आवंटित करें',
      },
      BUREAU_OFFICER: {
        title: 'अखिल भारतीय अनुमोदन ब्यूरो नियंत्रण केंद्र',
        subtitle:
          'राष्ट्रीय लंबित मामले, एसएसी/एसएचसी अपील अनुशंसाएं एवं सक्षम प्राधिकारी निर्णय',
        tableTitle: 'ब्यूरो समीक्षा एवं अंतिम निर्णय हेतु लंबित आवेदन',
        regionalMatrixTitle: 'अंतर-क्षेत्रीय लंबित एवं समय-सीमा उल्लंघन तालिका',
        primaryAction: 'सक्षम प्राधिकारी निर्णय दर्ज करें',
      },
      COMMITTEE_MEMBER: {
        title: 'वैधानिक स्क्रूटनी एवं ईवीसी निरीक्षण पंजिका',
        subtitle:
          'आवंटित संस्थागत फ़ाइलें, दस्तावेज़ सत्यापन जांच-सूची एवं ईवीसी निरीक्षण रिपोर्ट',
        tableTitle: 'समिति मूल्यांकन हेतु आवंटित प्रकरण',
        checklistTitle: 'वैधानिक सत्यापन जांच-सूची (APP-2026-WRO-00104)',
        primaryAction: 'हस्ताक्षरित निरीक्षण रिपोर्ट जमा करें',
      },
      ADMIN: {
        title: 'नियामक पाइपलाइन एवं ऑडिट प्रशासन कंसोल',
        subtitle:
          'संस्करणयुक्त APH 2024-27 वर्कफ़्लो स्कीमा, एसएलए नीतियां एवं अपरिवर्तनीय ऑडिट लॉग',
        tableTitle: 'अपरिवर्तनीय लेनदेन ऑडिट पंजिका (Audit Log)',
        pipelineTitle: 'संस्करणयुक्त पाइपलाइन परिभाषाएं (Workflow-as-Data)',
        primaryAction: 'ऑडिट खाता अखंडता सत्यापित करें',
      },
    },
    tableHeaders: {
      applicationId: 'आवेदन संदर्भ',
      aicteId: 'स्थायी आईडी',
      institutionName: 'संस्थान का नाम',
      region: 'क्षेत्र',
      stateCity: 'राज्य / जिला',
      programType: 'पाठ्यक्रम श्रेणी',
      stage: 'वैधानिक चरण',
      status: 'वर्तमान स्थिति',
      slaStatus: 'एसएलए घड़ी',
      submittedOn: 'प्रस्तुति तिथि',
      actions: 'कार्रवाई',
      conditionType: 'शर्त श्रेणी',
      dueDate: 'अनुपालन अंतिम तिथि',
      evidenceType: 'आवश्यक साक्ष्य',
      documentType: 'वैधानिक दस्तावेज़',
      documentNo: 'पंजीकरण संख्या',
      expiryDate: 'वैधता समाप्ति',
    },
  },
};

