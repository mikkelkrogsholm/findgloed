import type { EmailService } from "./types";

export class ResendEmailService implements EmailService {
  constructor(
    private readonly apiKey: string,
    private readonly fromEmail: string,
    private readonly supportEmail: string
  ) {}

  async sendWaitlistConfirm(email: string, confirmUrl: string): Promise<void> {
    if (!this.apiKey || !this.fromEmail) {
      return;
    }

    const subject = "Bekræft din tilmelding til Glød";
    const text = [
      "Tak for din tilmelding.",
      "Klik på linket for at bekræfte din email:",
      confirmUrl,
      this.supportEmail ? `Support: ${this.supportEmail}` : ""
    ]
      .filter(Boolean)
      .join("\n");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: [email],
        subject,
        text
      })
    });

    if (!response.ok) {
      throw new Error(`Resend confirm failed with status ${response.status}`);
    }
  }

  async sendWaitlistWelcome(email: string): Promise<void> {
    if (!this.apiKey || !this.fromEmail) {
      return;
    }

    const subject = "Du er på listen hos Glød";
    const text = [
      "Tak for din tilmelding til Glød.",
      "Vi giver dig besked, når næste skridt er klar.",
      this.supportEmail ? `Support: ${this.supportEmail}` : ""
    ]
      .filter(Boolean)
      .join("\n");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: [email],
        subject,
        text
      })
    });

    if (!response.ok) {
      throw new Error(`Resend welcome failed with status ${response.status}`);
    }
  }
}
