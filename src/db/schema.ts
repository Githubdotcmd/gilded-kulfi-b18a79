import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

// Singleton row (id = 1) holding the landing-page configuration.
export const landingSettings = pgTable("landing_settings", {
  id: integer("id").primaryKey(),
  brandName: text("brand_name").notNull(),
  badgeText: text("badge_text").notNull(),
  mainTitle: text("main_title").notNull(),
  subtitle: text("subtitle").notNull(),
  subjectLabel: text("subject_label").notNull(),
  subjectValue: text("subject_value").notNull(),
  facultyLabel: text("faculty_label").notNull(),
  facultyValue: text("faculty_value").notNull(),
  portalLabel: text("portal_label").notNull(),
  portalValue: text("portal_value").notNull(),
  chooseTitle: text("choose_title").notNull(),
  chooseSubtitle: text("choose_subtitle").notNull(),
  footerText: text("footer_text").notNull(),
  logoUrl: text("logo_url").notNull(),
  personalImageUrl: text("personal_image_url").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Each section is an independent student directory + attendance system.
export const sections = pgTable("sections", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(), // Landing card title, e.g. "Section 1A"
  description: text("description").notNull(), // Landing card description
  destination: text("destination").notNull(), // Landing card destination path
  sortOrder: integer("sort_order").notNull().default(0),
  // Directory (header) information shown on the section page
  brandName: text("brand_name").notNull(),
  badgeText: text("badge_text").notNull(),
  pageTitle: text("page_title").notNull(),
  pageSubtitle: text("page_subtitle").notNull(),
  subjectName: text("subject_name").notNull(),
  facultyName: text("faculty_name").notNull(),
  sectionName: text("section_name").notNull(),
  footerText: text("footer_text").notNull(),
  leftLogoUrl: text("left_logo_url").notNull(),
  rightLogoUrl: text("right_logo_url").notNull(),
  // Attendance state
  attendanceSubmitted: boolean("attendance_submitted").notNull().default(false),
  submittedAt: timestamp("submitted_at"),
  attendanceDate: text("attendance_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id")
    .notNull()
    .references(() => sections.id, { onDelete: "cascade" }),
  serial: integer("serial").notNull(),
  name: text("name").notNull(),
  ruid: text("ruid").notNull(),
  email: text("email").notNull(),
  status: text("status"), // 'present' | 'absent' | null (unmarked)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type LandingSettings = typeof landingSettings.$inferSelect;
export type Section = typeof sections.$inferSelect;
export type Student = typeof students.$inferSelect;
