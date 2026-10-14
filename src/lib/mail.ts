import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { appUrl } from "./utils";

type Mail = { to: string | string[]; subject: string; heading: string; body: string[]; cta?: { label: string; href: string } };

let transport: Transporter | null = null;

function getTransport() {
  if (!process.env.SMTP_URL) return null;
  transport ??= nodemailer.createTransport(process.env.SMTP_URL);
  return transport;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function renderHtml(mail: Mail) {
  const paragraphs = mail.body
    .map((p) => `<p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:24px">${escapeHtml(p)}</p>`)
    .join("");
  const cta = mail.cta
    ? `<a href="${escapeHtml(mail.cta.href)}" style="display:inline-block;background:#4338ca;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:8px">${escapeHtml(mail.cta.label)}</a>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:12px;border:1px solid #e4e4e7">
<tr><td style="padding:32px">
<div style="font-weight:700;font-size:16px;color:#18181b;margin-bottom:24px">ClientDesk</div>
<h1 style="margin:0 0 16px;font-size:20px;color:#18181b">${escapeHtml(mail.heading)}</h1>
${paragraphs}${cta}
</td></tr></table>
<p style="color:#a1a1aa;font-size:12px;margin-top:16px">Sent by ClientDesk · <a href="${appUrl()}" style="color:#a1a1aa">${appUrl()}</a></p>
</td></tr></table></body></html>`;
}

/**
 * Sends a transactional email. Without SMTP configured, the message is logged
 * so the flow can still be exercised locally. Never throws: a failed email must
 * not fail the action that triggered it.
 */
export async function sendMail(mail: Mail) {
  const recipients = Array.isArray(mail.to) ? mail.to : [mail.to];
  if (recipients.length === 0) return;
  const text = [mail.heading, "", ...mail.body, mail.cta ? `${mail.cta.label}: ${mail.cta.href}` : ""].join("\n");
  const t = getTransport();
  if (!t) {
    console.info(`\n[mail] To: ${recipients.join(", ")}\n[mail] Subject: ${mail.subject}\n${text}\n`);
    return;
  }
  try {
    await t.sendMail({
      from: process.env.EMAIL_FROM ?? "ClientDesk <no-reply@clientdesk.local>",
      to: recipients,
      subject: mail.subject,
      text,
      html: renderHtml(mail),
    });
  } catch (error) {
    console.error("[mail] failed to send", error);
  }
}

export function isMailConfigured() {
  return Boolean(process.env.SMTP_URL);
}
