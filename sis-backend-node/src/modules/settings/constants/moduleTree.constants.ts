export interface FeatureItem {
  key: string;
  label: string;
  perm_cat_id?: number;
}

export interface SubModuleItem {
  id: string;
  name: string;
  features: FeatureItem[];
}

export interface MasterModuleGroup {
  id: string;
  name: string;
  short_code: string;
  subModules: SubModuleItem[];
}

export const MASTER_MODULE_TREE: MasterModuleGroup[] = [
  {
    id: 'm_front_office',
    name: 'Front Office',
    short_code: 'front_office',
    subModules: [
      {
        id: 'sm_fo_1',
        name: 'Admission Enquiry',
        features: [
          { key: 'fo_enquiry_list', label: 'Admission Enquiry List & Follow-ups', perm_cat_id: 78 },
          { key: 'fo_enquiry_create', label: 'Create New Enquiry', perm_cat_id: 78 },
          { key: 'fo_enquiry_followup', label: 'Follow Up & Call Notes', perm_cat_id: 79 },
          { key: 'fo_enquiry_status', label: 'Update Lead / Enquiry Status', perm_cat_id: 78 }
        ]
      },
      {
        id: 'sm_fo_2',
        name: 'Visitor Book',
        features: [
          { key: 'fo_visitor_list', label: 'Visitor Directory & Log', perm_cat_id: 80 },
          { key: 'fo_visitor_add', label: 'Add Visitor Entry', perm_cat_id: 80 },
          { key: 'fo_visitor_pass', label: 'Print Gate Pass', perm_cat_id: 80 }
        ]
      },
      {
        id: 'sm_fo_3',
        name: 'Phone Call Log',
        features: [
          { key: 'fo_call_log', label: 'Call History Records', perm_cat_id: 81 },
          { key: 'fo_call_add', label: 'Log New Call Entry', perm_cat_id: 81 }
        ]
      },
      {
        id: 'sm_fo_4',
        name: 'Postal Dispatch',
        features: [
          { key: 'fo_postal_dispatch', label: 'Postal Dispatch List & Add', perm_cat_id: 82 },
          { key: 'fo_postal_receive', label: 'Postal Receive List & Add', perm_cat_id: 83 }
        ]
      },
      {
        id: 'sm_fo_5',
        name: 'Complaints',
        features: [
          { key: 'fo_complaint_list', label: 'Complaints Directory', perm_cat_id: 84 },
          { key: 'fo_complaint_add', label: 'Register & Resolve Complaints', perm_cat_id: 84 }
        ]
      },
      {
        id: 'sm_fo_6',
        name: 'Setup Front Office',
        features: [
          { key: 'fo_setup_master', label: 'Manage Purpose, Source & Complaint Types', perm_cat_id: 85 }
        ]
      }
    ]
  },
  {
    id: 'm_student_info',
    name: 'Student Information',
    short_code: 'student_information',
    subModules: [
      {
        id: 'sm_si_1',
        name: 'Student Management',
        features: [
          { key: 'si_student_roster', label: 'Student Directory & Roster', perm_cat_id: 1 },
          { key: 'si_student_import', label: 'Bulk Student Import (CSV/Excel)', perm_cat_id: 2 },
          { key: 'si_student_edit', label: 'Edit Student Details & Bio', perm_cat_id: 1 }
        ]
      },
      {
        id: 'sm_si_2',
        name: 'Student Profile',
        features: [
          { key: 'si_profile_view', label: 'Student Profile 360 View & Details', perm_cat_id: 1 },
          { key: 'si_profile_timeline', label: 'Student Timeline & Activity Log', perm_cat_id: 1 },
          { key: 'si_profile_login', label: 'Login Credentials Management', perm_cat_id: 1 }
        ]
      },
      {
        id: 'sm_si_3',
        name: 'Document Locker',
        features: [
          { key: 'si_locker_view', label: 'Digital Document Locker View', perm_cat_id: 1 },
          { key: 'si_locker_upload', label: 'Upload & Verify Documents', perm_cat_id: 1 },
          { key: 'si_locker_delete', label: 'Delete Student Documents', perm_cat_id: 1 }
        ]
      },
      {
        id: 'sm_si_4',
        name: 'Admission Management',
        features: [
          { key: 'si_admission_create', label: 'New Student Admission Entry', perm_cat_id: 1 },
          { key: 'si_admission_online', label: 'Online Admission Applications Review', perm_cat_id: 232 },
          { key: 'si_admission_process', label: 'Approve / Enroll Student Admission', perm_cat_id: 1 }
        ]
      },
      {
        id: 'sm_si_5',
        name: 'Student Status',
        features: [
          { key: 'si_status_view', label: 'Student Status & Disabled Students List', perm_cat_id: 4 },
          { key: 'si_status_toggle', label: 'Enable / Disable Student Status', perm_cat_id: 4 },
          { key: 'si_status_reasons', label: 'Manage Disable Reasons', perm_cat_id: 6 }
        ]
      },
      {
        id: 'sm_si_6',
        name: 'Bulk Delete',
        features: [
          { key: 'si_bulk_delete_view', label: 'Bulk Delete Search & Filter', perm_cat_id: 1 },
          { key: 'si_bulk_delete_exec', label: 'Execute Permanent Bulk Delete', perm_cat_id: 1 }
        ]
      },
      {
        id: 'sm_si_7',
        name: 'Student Categories',
        features: [
          { key: 'si_cat_manage', label: 'Student Categories Setup & List', perm_cat_id: 3 },
          { key: 'si_cat_assign', label: 'Assign Categories to Students', perm_cat_id: 3 }
        ]
      },
      {
        id: 'sm_si_8',
        name: 'Student House',
        features: [
          { key: 'si_house_manage', label: 'Student House Setup & List', perm_cat_id: 5 },
          { key: 'si_house_assign', label: 'Assign Houses to Students', perm_cat_id: 5 }
        ]
      }
    ]
  },
  {
    id: 'm_academics',
    name: 'Academics',
    short_code: 'academics',
    subModules: [
      {
        id: 'sm_acad_1',
        name: 'Class Timetable',
        features: [
          { key: 'acad_timetable_class', label: 'Class Weekly Schedule Matrix', perm_cat_id: 23 },
          { key: 'acad_timetable_save', label: 'Create & Modify Class Timetable', perm_cat_id: 23 }
        ]
      },
      {
        id: 'sm_acad_2',
        name: 'Teachers Timetable',
        features: [
          { key: 'acad_timetable_teacher', label: 'Teacher-wise Weekly Timetable', perm_cat_id: 24 }
        ]
      },
      {
        id: 'sm_acad_3',
        name: 'Assign Class Teacher',
        features: [
          { key: 'acad_assign_classteacher', label: 'Assign Class & Section Teachers', perm_cat_id: 25 }
        ]
      },
      {
        id: 'sm_acad_4',
        name: 'Transfer Students',
        features: [
          { key: 'acad_promote_students', label: 'Promote / Transfer Students to Next Session', perm_cat_id: 26 }
        ]
      },
      {
        id: 'sm_acad_5',
        name: 'Subject Group',
        features: [
          { key: 'acad_subject_group', label: 'Manage Subject Groups & Class Combinations', perm_cat_id: 29 }
        ]
      },
      {
        id: 'sm_acad_6',
        name: 'Subjects',
        features: [
          { key: 'acad_subjects', label: 'Manage School Subjects & Subject Codes', perm_cat_id: 29 }
        ]
      },
      {
        id: 'sm_acad_7',
        name: 'Class Management',
        features: [
          { key: 'acad_class_manage', label: 'Manage Classes & Standards', perm_cat_id: 27 }
        ]
      },
      {
        id: 'sm_acad_8',
        name: 'Sections',
        features: [
          { key: 'acad_section_manage', label: 'Manage Class Sections & Divisions', perm_cat_id: 28 }
        ]
      }
    ]
  },
  {
    id: 'm_attendance',
    name: 'Attendance',
    short_code: 'attendance',
    subModules: [
      {
        id: 'sm_att_1',
        name: 'Daily Attendance',
        features: [
          { key: 'att_daily_mark', label: 'Daily Class Attendance Marking', perm_cat_id: 20 },
          { key: 'att_biometric_sync', label: 'BioMetric Device Attendance Sync', perm_cat_id: 220 }
        ]
      },
      {
        id: 'sm_att_2',
        name: 'Attendance By Date',
        features: [
          { key: 'att_by_date', label: 'Attendance Overview & Register By Date', perm_cat_id: 21 }
        ]
      },
      {
        id: 'sm_att_3',
        name: 'Approve Leave',
        features: [
          { key: 'att_leave_approve', label: 'Approve / Reject Student Leave Applications', perm_cat_id: 22 },
          { key: 'att_leave_apply', label: 'Submit Student Leave Request', perm_cat_id: 22 }
        ]
      }
    ]
  },
  {
    id: 'm_examinations',
    name: 'Examinations',
    short_code: 'examinations',
    subModules: [
      {
        id: 'sm_exam_1',
        name: 'Exam Group',
        features: [
          { key: 'exam_group_manage', label: 'Manage Exam Groups & Linking', perm_cat_id: 30 }
        ]
      },
      {
        id: 'sm_exam_2',
        name: 'Exam Schedule',
        features: [
          { key: 'exam_schedule_dates', label: 'Schedule Exam Dates & Timetables', perm_cat_id: 31 }
        ]
      },
      {
        id: 'sm_exam_3',
        name: 'Exam Result',
        features: [
          { key: 'exam_marks_entry', label: 'Marks Entry by Class & Subject', perm_cat_id: 32 },
          { key: 'exam_result_publish', label: 'Publish & View Exam Results', perm_cat_id: 32 }
        ]
      },
      {
        id: 'sm_exam_4',
        name: 'Design Admit Card',
        features: [
          { key: 'exam_admit_design', label: 'Design Admit Card Layouts', perm_cat_id: 33 }
        ]
      },
      {
        id: 'sm_exam_5',
        name: 'Print Admit Card',
        features: [
          { key: 'exam_admit_print', label: 'Generate & Print Student Admit Cards', perm_cat_id: 33 }
        ]
      },
      {
        id: 'sm_exam_6',
        name: 'Design Marksheet',
        features: [
          { key: 'exam_marksheet_design', label: 'Design Marksheet Templates', perm_cat_id: 34 }
        ]
      },
      {
        id: 'sm_exam_7',
        name: 'Print Marksheet',
        features: [
          { key: 'exam_marksheet_print', label: 'Generate & Print Student Marksheets', perm_cat_id: 34 }
        ]
      },
      {
        id: 'sm_exam_8',
        name: 'Marks Grade',
        features: [
          { key: 'exam_marks_grade', label: 'Grades & Grading Point Systems', perm_cat_id: 30 }
        ]
      }
    ]
  },
  {
    id: 'm_online_exams',
    name: 'Online Exams',
    short_code: 'online_examination',
    subModules: [
      {
        id: 'sm_oe_1',
        name: 'Online Exams List',
        features: [
          { key: 'oe_exam_list', label: 'Create & Publish Online Examinations', perm_cat_id: 185 },
          { key: 'oe_assign_students', label: 'Assign Students to Online Exam', perm_cat_id: 222 }
        ]
      },
      {
        id: 'sm_oe_2',
        name: 'Question Bank',
        features: [
          { key: 'oe_question_bank', label: 'Manage Question Bank Repository', perm_cat_id: 186 },
          { key: 'oe_question_add', label: 'Add Questions in Exam Paper', perm_cat_id: 214 }
        ]
      }
    ]
  },
  {
    id: 'm_competitive_exams',
    name: 'Competitive Exams',
    short_code: 'competitive_exams',
    subModules: [
      {
        id: 'sm_ce_1',
        name: 'Dashboard',
        features: [
          { key: 'ce_dashboard', label: 'Competitive Exams Overview & Metrics', perm_cat_id: 205 }
        ]
      },
      {
        id: 'sm_ce_2',
        name: 'Exam Setup',
        features: [
          { key: 'ce_exam_setup', label: 'Exam Setup, Rules & Eligibility', perm_cat_id: 205 }
        ]
      },
      {
        id: 'sm_ce_3',
        name: 'Registrations',
        features: [
          { key: 'ce_registrations', label: 'Candidate Registrations & Roster', perm_cat_id: 210 }
        ]
      },
      {
        id: 'sm_ce_4',
        name: 'Hall Tickets',
        features: [
          { key: 'ce_hall_tickets', label: 'Generate & Print Hall Tickets', perm_cat_id: 142 }
        ]
      },
      {
        id: 'sm_ce_5',
        name: 'Result Entry',
        features: [
          { key: 'ce_results_entry', label: 'Competitive Marks Entry & Ranks', perm_cat_id: 212 }
        ]
      },
      {
        id: 'sm_ce_6',
        name: 'Performance Reports',
        features: [
          { key: 'ce_reports', label: 'Merit List & Performance Analytics', perm_cat_id: 203 }
        ]
      },
      {
        id: 'sm_ce_7',
        name: 'Notifications',
        features: [
          { key: 'ce_notifications', label: 'Broadcast Exam Alerts & Updates', perm_cat_id: 217 }
        ]
      }
    ]
  },
  {
    id: 'm_lesson_plan',
    name: 'Lesson Plan',
    short_code: 'lesson_plan',
    subModules: [
      {
        id: 'sm_lp_1',
        name: 'Manage Lesson Plan',
        features: [
          { key: 'lp_plan_manage', label: 'Create & Track Lesson Plans', perm_cat_id: 236 }
        ]
      },
      {
        id: 'sm_lp_2',
        name: 'Manage Syllabus Status',
        features: [
          { key: 'lp_syllabus_status', label: 'Monitor Syllabus Completion Status', perm_cat_id: 237 }
        ]
      },
      {
        id: 'sm_lp_3',
        name: 'Lessons & Topics',
        features: [
          { key: 'lp_lessons_topics', label: 'Manage Lesson Titles & Chapter Topics', perm_cat_id: 238 }
        ]
      }
    ]
  },
  {
    id: 'm_homework',
    name: 'Homework',
    short_code: 'homework',
    subModules: [
      {
        id: 'sm_hw_1',
        name: 'Homework',
        features: [
          { key: 'hw_homework_list', label: 'Assign & Manage Daily Homework', perm_cat_id: 93 }
        ]
      },
      {
        id: 'sm_hw_2',
        name: 'Homework Evaluation',
        features: [
          { key: 'hw_homework_eval', label: 'Evaluate Submissions & Grade Homework', perm_cat_id: 94 }
        ]
      }
    ]
  },
  {
    id: 'm_human_resource',
    name: 'Human Resource',
    short_code: 'human_resource',
    subModules: [
      {
        id: 'sm_hr_1',
        name: 'Teacher Management',
        features: [
          { key: 'hr_teacher_manage', label: 'Teacher Profiles, Assignments & Monitoring', perm_cat_id: 86 }
        ]
      },
      {
        id: 'sm_hr_2',
        name: 'Staff Management',
        features: [
          { key: 'hr_staff_manage', label: 'Staff Directory, Profiles & Payroll Setup', perm_cat_id: 86 }
        ]
      },
      {
        id: 'sm_hr_3',
        name: 'Leave Management',
        features: [
          { key: 'hr_leave_manage', label: 'Approve / Reject Staff Leave Requests', perm_cat_id: 108 }
        ]
      },
      {
        id: 'sm_hr_4',
        name: 'Teachers Rating',
        features: [
          { key: 'hr_ratings_view', label: 'Teachers Ratings & Student Feedback', perm_cat_id: 189 }
        ]
      },
      {
        id: 'sm_hr_5',
        name: 'Department',
        features: [
          { key: 'hr_dept_manage', label: 'Manage School Departments', perm_cat_id: 111 }
        ]
      },
      {
        id: 'sm_hr_6',
        name: 'Designation',
        features: [
          { key: 'hr_desig_manage', label: 'Manage Staff Designations', perm_cat_id: 112 }
        ]
      },
      {
        id: 'sm_hr_7',
        name: 'Disabled Staff',
        features: [
          { key: 'hr_disabled_staff', label: 'Inactive & Disabled Staff Directory', perm_cat_id: 87 }
        ]
      }
    ]
  },
  {
    id: 'm_fees_management',
    name: 'Fees Management',
    short_code: 'fees_collection',
    subModules: [
      {
        id: 'sm_fees_1',
        name: 'Academic Fees',
        features: [
          { key: 'fees_academic_collect', label: 'Collect Student Fees & Issue Receipts', perm_cat_id: 7 },
          { key: 'fees_academic_revert', label: 'Revert / Cancel Fee Transaction', perm_cat_id: 7 },
          { key: 'fees_academic_print', label: 'Print Fee Invoices & Receipts', perm_cat_id: 7 }
        ]
      },
      {
        id: 'sm_fees_2',
        name: 'Fee Allocation',
        features: [
          { key: 'fees_alloc_master', label: 'Fee Groups, Types & Master Allocations', perm_cat_id: 11 },
          { key: 'fees_alloc_discounts', label: 'Fee Discounts & Concession Rules', perm_cat_id: 12 }
        ]
      }
    ]
  },
  {
    id: 'm_finance',
    name: 'Finance Management',
    short_code: 'income_expense',
    subModules: [
      {
        id: 'sm_fin_1',
        name: 'Income',
        features: [
          { key: 'fin_income_list', label: 'Income Directory & Add Income', perm_cat_id: 14 },
          { key: 'fin_income_heads', label: 'Manage Income Heads & Categories', perm_cat_id: 16 }
        ]
      },
      {
        id: 'sm_fin_2',
        name: 'Expense',
        features: [
          { key: 'fin_expense_list', label: 'Expense Directory & Add Expense', perm_cat_id: 17 },
          { key: 'fin_expense_heads', label: 'Manage Expense Heads & Categories', perm_cat_id: 19 }
        ]
      }
    ]
  },
  {
    id: 'm_hostel',
    name: 'Hostel',
    short_code: 'hostel_rooms',
    subModules: [
      {
        id: 'sm_ht_1',
        name: 'Hostel Dashboard',
        features: [
          { key: 'ht_dashboard_view', label: 'Hostel Occupancy & Capacity Overview', perm_cat_id: 38 }
        ]
      },
      {
        id: 'sm_ht_2',
        name: 'Hostel Room',
        features: [
          { key: 'ht_rooms_manage', label: 'Hostel Rooms & Bed Allocations', perm_cat_id: 38 }
        ]
      },
      {
        id: 'sm_ht_3',
        name: 'Add Room Type',
        features: [
          { key: 'ht_room_type', label: 'Room Types & Rate Slabs Setup', perm_cat_id: 39 }
        ]
      },
      {
        id: 'sm_ht_4',
        name: 'Add Hostel',
        features: [
          { key: 'ht_hostel_manage', label: 'Hostel Buildings, Blocks & Wardens', perm_cat_id: 40 }
        ]
      }
    ]
  },
  {
    id: 'm_transport',
    name: 'Transport',
    short_code: 'transport_routes',
    subModules: [
      {
        id: 'sm_tp_1',
        name: 'Routes',
        features: [
          { key: 'tp_routes_manage', label: 'Manage Bus Routes, Stops & Fares', perm_cat_id: 35 }
        ]
      },
      {
        id: 'sm_tp_2',
        name: 'Vehicles',
        features: [
          { key: 'tp_vehicles_manage', label: 'Manage Fleet Vehicles & Insurance', perm_cat_id: 36 }
        ]
      },
      {
        id: 'sm_tp_3',
        name: 'Assign Vehicle',
        features: [
          { key: 'tp_assign_vehicle', label: 'Assign Vehicles & Drivers to Routes', perm_cat_id: 37 }
        ]
      }
    ]
  },
  {
    id: 'm_library',
    name: 'Library',
    short_code: 'library',
    subModules: [
      {
        id: 'sm_lib_1',
        name: 'Book List',
        features: [
          { key: 'lib_book_list', label: 'Books Inventory Directory & Add Book', perm_cat_id: 45 }
        ]
      },
      {
        id: 'sm_lib_2',
        name: 'Issue Return',
        features: [
          { key: 'lib_issue_return', label: 'Issue Books & Process Returns', perm_cat_id: 46 }
        ]
      },
      {
        id: 'sm_lib_3',
        name: 'Library Members',
        features: [
          { key: 'lib_members_manage', label: 'Student & Staff Library Memberships', perm_cat_id: 47 }
        ]
      }
    ]
  },
  {
    id: 'm_inventory',
    name: 'Inventory',
    short_code: 'inventory',
    subModules: [
      {
        id: 'sm_inv_1',
        name: 'Issue Item',
        features: [
          { key: 'inv_issue_item', label: 'Issue Items to Staff / Department', perm_cat_id: 48 }
        ]
      },
      {
        id: 'sm_inv_2',
        name: 'Item Stock',
        features: [
          { key: 'inv_item_stock', label: 'Inventory Stock Inward & History', perm_cat_id: 49 }
        ]
      },
      {
        id: 'sm_inv_3',
        name: 'Add Item',
        features: [
          { key: 'inv_item_manage', label: 'Item Master Management', perm_cat_id: 50 }
        ]
      },
      {
        id: 'sm_inv_4',
        name: 'Item Category',
        features: [
          { key: 'inv_category_manage', label: 'Manage Item Categories', perm_cat_id: 51 }
        ]
      },
      {
        id: 'sm_inv_5',
        name: 'Item Store',
        features: [
          { key: 'inv_store_manage', label: 'Manage Inventory Stores & Godowns', perm_cat_id: 52 }
        ]
      },
      {
        id: 'sm_inv_6',
        name: 'Item Supplier',
        features: [
          { key: 'inv_supplier_manage', label: 'Manage Item Suppliers & Vendors', perm_cat_id: 52 }
        ]
      }
    ]
  },
  {
    id: 'm_download_center',
    name: 'Download Center',
    short_code: 'download_center',
    subModules: [
      {
        id: 'sm_dc_1',
        name: 'Upload Content',
        features: [
          { key: 'dc_upload_content', label: 'Upload Study Materials, Syllabus & Assignments', perm_cat_id: 95 }
        ]
      },
      {
        id: 'sm_dc_2',
        name: 'Download Content',
        features: [
          { key: 'dc_download_content', label: 'View & Download School Resources', perm_cat_id: 95 }
        ]
      }
    ]
  },
  {
    id: 'm_sports',
    name: 'Sports Management',
    short_code: 'sports_management',
    subModules: [
      {
        id: 'sm_sp_1',
        name: 'Sports Categories',
        features: [
          { key: 'sp_categories', label: 'Manage Sports Disciplines & Categories', perm_cat_id: 205 }
        ]
      },
      {
        id: 'sm_sp_2',
        name: 'Team Management',
        features: [
          { key: 'sp_teams', label: 'School Sports Teams & Squads', perm_cat_id: 210 }
        ]
      },
      {
        id: 'sm_sp_3',
        name: 'Tournament Management',
        features: [
          { key: 'sp_tournaments', label: 'Tournament Fixtures & Schedules', perm_cat_id: 205 }
        ]
      },
      {
        id: 'sm_sp_4',
        name: 'Student Performance',
        features: [
          { key: 'sp_performance', label: 'Student Sports Achievements & Records', perm_cat_id: 212 }
        ]
      },
      {
        id: 'sm_sp_5',
        name: 'Reports',
        features: [
          { key: 'sp_reports', label: 'Sports Performance & Event Reports', perm_cat_id: 204 }
        ]
      }
    ]
  },
  {
    id: 'm_certificate',
    name: 'Certificate',
    short_code: 'certificate',
    subModules: [
      {
        id: 'sm_cert_1',
        name: 'School Documents',
        features: [
          { key: 'cert_school_docs', label: 'Design & Issue School Certificates & Bonafide', perm_cat_id: 96 }
        ]
      },
      {
        id: 'sm_cert_2',
        name: 'ID Card Management',
        features: [
          { key: 'cert_id_cards', label: 'Design & Print Student & Staff ID Cards', perm_cat_id: 98 }
        ]
      }
    ]
  },
  {
    id: 'm_communicate',
    name: 'Communicate',
    short_code: 'communicate',
    subModules: [
      {
        id: 'sm_com_1',
        name: 'Notice Board',
        features: [
          { key: 'com_notice_board', label: 'Post & Manage School Notice Board', perm_cat_id: 91 }
        ]
      },
      {
        id: 'sm_com_2',
        name: 'Communication Center',
        features: [
          { key: 'com_comm_center', label: 'Send Bulk Emails & SMS Broadcasts', perm_cat_id: 92 }
        ]
      },
      {
        id: 'sm_com_3',
        name: 'WhatsApp Center',
        features: [
          { key: 'com_whatsapp', label: 'WhatsApp Broadcast & Message Templates', perm_cat_id: 92 }
        ]
      }
    ]
  },
  {
    id: 'm_announcements',
    name: 'Announcements',
    short_code: 'announcements',
    subModules: [
      {
        id: 'sm_ann_1',
        name: 'Announcements',
        features: [
          { key: 'ann_broadcast', label: 'School-wide Announcements & Priority Alerts', perm_cat_id: 91 }
        ]
      }
    ]
  },
  {
    id: 'm_alumni',
    name: 'Alumni',
    short_code: 'alumni',
    subModules: [
      {
        id: 'sm_alm_1',
        name: 'Alumni Directory',
        features: [
          { key: 'alm_directory', label: 'Manage Alumni Directory & Profiles', perm_cat_id: 234 }
        ]
      },
      {
        id: 'sm_alm_2',
        name: 'Alumni Events',
        features: [
          { key: 'alm_events', label: 'Alumni Events, Reunions & Photos', perm_cat_id: 235 }
        ]
      }
    ]
  },
  {
    id: 'm_front_cms',
    name: 'Front CMS',
    short_code: 'front_cms',
    subModules: [
      {
        id: 'sm_cms_1',
        name: 'Content Management',
        features: [
          { key: 'cms_content', label: 'Manage Website Menus, Pages & Content', perm_cat_id: 61 }
        ]
      },
      {
        id: 'sm_cms_2',
        name: 'Visual Content',
        features: [
          { key: 'cms_visual', label: 'Banners, Media Manager & Gallery Albums', perm_cat_id: 62 }
        ]
      },
      {
        id: 'sm_cms_3',
        name: 'Website Structure',
        features: [
          { key: 'cms_structure', label: 'Menus, Navigation & Site Layout Structure', perm_cat_id: 64 }
        ]
      },
      {
        id: 'sm_cms_4',
        name: 'Event Management',
        features: [
          { key: 'cms_events', label: 'Publish Public Events & School News', perm_cat_id: 66 }
        ]
      }
    ]
  },
  {
    id: 'm_system_settings',
    name: 'System Settings',
    short_code: 'system_settings',
    subModules: [
      {
        id: 'sm_set_1',
        name: 'General Settings',
        features: [
          { key: 'set_general', label: 'School Details, Currency, Timezone & Theme', perm_cat_id: 54 }
        ]
      },
      {
        id: 'sm_set_2',
        name: 'Session Management',
        features: [
          { key: 'set_session', label: 'Academic Sessions & Current Active Session', perm_cat_id: 55 }
        ]
      },
      {
        id: 'sm_set_3',
        name: 'Notification Settings',
        features: [
          { key: 'set_notif', label: 'Notification Event Triggers & Templates', perm_cat_id: 56 }
        ]
      },
      {
        id: 'sm_set_4',
        name: 'SMS Settings',
        features: [
          { key: 'set_sms', label: 'SMS Gateway Credentials & Gateways', perm_cat_id: 57 }
        ]
      },
      {
        id: 'sm_set_5',
        name: 'Email SMTP Settings',
        features: [
          { key: 'set_email', label: 'Email SMTP Configuration & Testing', perm_cat_id: 58 }
        ]
      },
      {
        id: 'sm_set_6',
        name: 'Users',
        features: [
          { key: 'set_users', label: 'System Users, Passwords & Account Controls', perm_cat_id: 126 }
        ]
      },
      {
        id: 'sm_set_7',
        name: 'Payments',
        features: [
          { key: 'set_payment', label: 'Payment Gateway Integrations', perm_cat_id: 60 }
        ]
      },
      {
        id: 'sm_set_8',
        name: 'Print Header/Footer',
        features: [
          { key: 'set_print', label: 'Print Header / Footer Setup', perm_cat_id: 233 }
        ]
      },
      {
        id: 'sm_set_9',
        name: 'Front CMS Settings',
        features: [
          { key: 'set_front_cms', label: 'Front CMS Global Settings', perm_cat_id: 61 }
        ]
      },
      {
        id: 'sm_set_10',
        name: 'Backup & Restore',
        features: [
          { key: 'set_backup', label: 'Database Backup & Restore Operations', perm_cat_id: 130 }
        ]
      },
      {
        id: 'sm_set_11',
        name: 'Languages',
        features: [
          { key: 'set_languages', label: 'Languages & Translations (i18n)', perm_cat_id: 53 }
        ]
      },
      {
        id: 'sm_set_12',
        name: 'Modules Settings',
        features: [
          { key: 'set_modules', label: 'Global Module Enable/Disable Settings', perm_cat_id: 53 }
        ]
      },
      {
        id: 'sm_set_13',
        name: 'Custom Fields',
        features: [
          { key: 'set_custom_fields', label: 'Custom Fields Configuration', perm_cat_id: 215 }
        ]
      },
      {
        id: 'sm_set_14',
        name: 'System Fields',
        features: [
          { key: 'set_system_fields', label: 'System Fields Configuration', perm_cat_id: 215 }
        ]
      },
      {
        id: 'sm_set_15',
        name: 'Profile Update Settings',
        features: [
          { key: 'set_profile_update', label: 'Profile Update Rules & Permissions', perm_cat_id: 53 }
        ]
      },
      {
        id: 'sm_set_16',
        name: 'System Update',
        features: [
          { key: 'set_system_update', label: 'System Updates & Version Check', perm_cat_id: 53 }
        ]
      },
      {
        id: 'sm_set_17',
        name: 'Roles & Permissions',
        features: [
          { key: 'set_roles_perm', label: 'Roles & Access Permissions (RBAC)', perm_cat_id: 53 }
        ]
      }
    ]
  },
  {
    id: 'm_reports',
    name: 'Reports',
    short_code: 'reports',
    subModules: [
      {
        id: 'sm_rep_1',
        name: 'Student Information',
        features: [
          { key: 'rep_student_info', label: 'Student Information & Admission Reports', perm_cat_id: 146 }
        ]
      },
      {
        id: 'sm_rep_2',
        name: 'Finance',
        features: [
          { key: 'rep_finance', label: 'Finance, Income & Expense Reports', perm_cat_id: 159 }
        ]
      },
      {
        id: 'sm_rep_3',
        name: 'Attendance',
        features: [
          { key: 'rep_attendance', label: 'Daily & Period Attendance Reports', perm_cat_id: 164 }
        ]
      },
      {
        id: 'sm_rep_4',
        name: 'Examinations',
        features: [
          { key: 'rep_examinations', label: 'Exam Marks & Result Reports', perm_cat_id: 198 }
        ]
      },
      {
        id: 'sm_rep_5',
        name: 'Online Examination',
        features: [
          { key: 'rep_online_exam', label: 'Online Examination Attempt Reports', perm_cat_id: 201 }
        ]
      },
      {
        id: 'sm_rep_6',
        name: 'Lesson Plan',
        features: [
          { key: 'rep_lesson_plan', label: 'Lesson Plan Progress Reports', perm_cat_id: 236 }
        ]
      },
      {
        id: 'sm_rep_7',
        name: 'Human Resources',
        features: [
          { key: 'rep_hr', label: 'Staff Attendance & Payroll Reports', perm_cat_id: 161 }
        ]
      },
      {
        id: 'sm_rep_8',
        name: 'Library',
        features: [
          { key: 'rep_library', label: 'Library Issue & Stock Reports', perm_cat_id: 178 }
        ]
      },
      {
        id: 'sm_rep_9',
        name: 'Inventory',
        features: [
          { key: 'rep_inventory', label: 'Inventory Stock & Movement Reports', perm_cat_id: 178 }
        ]
      },
      {
        id: 'sm_rep_10',
        name: 'Transport',
        features: [
          { key: 'rep_transport', label: 'Transport Routes & Vehicle Reports', perm_cat_id: 174 }
        ]
      },
      {
        id: 'sm_rep_11',
        name: 'Hostel',
        features: [
          { key: 'rep_hostel', label: 'Hostel Occupancy & Bed Reports', perm_cat_id: 174 }
        ]
      },
      {
        id: 'sm_rep_12',
        name: 'Alumni',
        features: [
          { key: 'rep_alumni', label: 'Alumni Directory & Network Reports', perm_cat_id: 242 }
        ]
      },
      {
        id: 'sm_rep_13',
        name: 'User Log',
        features: [
          { key: 'rep_user_log', label: 'User Activity Log & Login History', perm_cat_id: 176 }
        ]
      },
      {
        id: 'sm_rep_14',
        name: 'Audit Trail Report',
        features: [
          { key: 'rep_audit_trail', label: 'System Audit Trail & Operations Log', perm_cat_id: 176 }
        ]
      }
    ]
  }
];
