export type MailFields = {
  from: string;
  to: string;
  subject: string;
  body: string;
};
export type MailMessage = MailFields & {
  id: string;
  folder: "drafts" | "sent";
  updatedAt: string;
  starred: boolean;
};
export type MailErrors = Partial<Record<keyof MailFields, string>>;
export function validateMail(fields: MailFields): MailErrors {
  const errors: MailErrors = {};
  for (const field of ["from", "to"] as const) {
    if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(fields[field].trim()))
      errors[field] =
        field === "to"
          ? "Enter one valid recipient email."
          : "Enter your email address.";
  }
  if (!fields.body.trim()) errors.body = "Write a message before sending.";
  return errors;
}
export function isMailMessage(value: unknown): value is MailMessage {
  if (!value || typeof value !== "object") return false;
  return (
    "id" in value &&
    typeof value.id === "string" &&
    "folder" in value &&
    (value.folder === "drafts" || value.folder === "sent") &&
    "updatedAt" in value &&
    typeof value.updatedAt === "string" &&
    Number.isFinite(Date.parse(value.updatedAt)) &&
    "starred" in value &&
    typeof value.starred === "boolean" &&
    "from" in value &&
    typeof value.from === "string" &&
    "to" in value &&
    typeof value.to === "string" &&
    "subject" in value &&
    typeof value.subject === "string" &&
    "body" in value &&
    typeof value.body === "string"
  );
}
export function searchMail(
  messages: MailMessage[],
  folder: MailMessage["folder"],
  query: string,
  starred = false,
) {
  const term = query.trim().toLocaleLowerCase();
  return messages
    .filter(
      (message) =>
        message.folder === folder &&
        (!starred || message.starred) &&
        [message.to, message.from, message.subject, message.body].some(
          (value) => value.toLocaleLowerCase().includes(term),
        ),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export const mailConfigured = Boolean(
  process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID &&
  process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID &&
  process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY,
);
export async function sendMail(fields: MailFields): Promise<void> {
  const service = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const template = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
  if (!service || !template || !publicKey)
    throw new Error(
      "Sending is not configured. Your draft is saved on this browser.",
    );
  const { default: emailjs } = await import("@emailjs/browser");
  const result = await emailjs.send(
    service,
    template,
    {
      to_email: fields.to.trim(),
      from_email: fields.from.trim(),
      subject: fields.subject.trim(),
      body: fields.body,
    },
    { publicKey, limitRate: { throttle: 5000 } },
  );
  if (result.status !== 200)
    throw new Error("The mail service did not accept this message.");
}
