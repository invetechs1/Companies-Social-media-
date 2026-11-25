import nodemailer from "nodemailer";
import { buildReportData, renderReportHtml } from "./report";
import { prisma } from "./db";

/**
 * SMTP email via nodemailer. Configured through env:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 * When unset, isMailConfigured() is false and callers degrade gracefully.
 */

export const isMailConfigured = () => !!process.env.SMTP_HOST && !!process.env.SMTP_FROM;

function transport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

export async function sendMail(to: string, subject: string, html: string) {
  if (!isMailConfigured()) throw new Error("Email is not configured. Set SMTP_* in .env.");
  await transport().sendMail({ from: process.env.SMTP_FROM, to, subject, html });
}

/** Builds and emails the performance report for one workspace. */
export async function sendReportEmail(organizationId: string, periodDays = 30, overrideTo?: string) {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) throw new Error("Workspace not found");
  const to = overrideTo || org.reportEmail;
  if (!to) throw new Error("No report recipient set for this workspace.");

  const data = await buildReportData(organizationId, periodDays);
  if (!data) throw new Error("Could not build report");

  const html = renderReportHtml(data);
  const subject = `${org.name} — social performance (last ${periodDays} days)`;
  await sendMail(to, subject, html);
  await prisma.organization.update({
    where: { id: organizationId },
    data: { reportLastSentAt: new Date() },
  });
  return { to, subject };
}
