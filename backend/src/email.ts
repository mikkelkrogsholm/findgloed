import type { EmailService } from "./types";

export class ResendEmailService implements EmailService {
  constructor(
    private readonly apiKey: string,
    private readonly fromEmail: string,
    private readonly supportEmail: string,
    // Navngiven dataansvarlig (issue A19) — bruges i mail-signaturen
    // så modtagerne kan se hvem der står bag platformen.
    private readonly dataControllerName: string = "",
    private readonly dataControllerEmail: string = ""
  ) {}

  private signature(): string {
    const lines: string[] = [];
    if (this.dataControllerName) {
      lines.push(`Dataansvarlig: ${this.dataControllerName}`);
    }
    if (this.dataControllerEmail) {
      lines.push(`Kontakt: ${this.dataControllerEmail}`);
    } else if (this.supportEmail) {
      lines.push(`Support: ${this.supportEmail}`);
    }
    return lines.join("\n");
  }

  async sendWaitlistConfirm(email: string, confirmUrl: string): Promise<void> {
    if (!this.apiKey || !this.fromEmail) {
      return;
    }

    const subject = "Bekræft din tilmelding til Glød";
    const text = [
      "Tak for din tilmelding.",
      "Klik på linket for at bekræfte din email:",
      confirmUrl,
      this.signature()
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
      this.signature()
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

  async sendPartnerInterestConfirm(email: string, confirmUrl: string): Promise<void> {
    if (!this.apiKey || !this.fromEmail) {
      return;
    }

    const subject = "Bekræft din samarbejdsforespørgsel hos Glød";
    const text = [
      "Tak for din interesse i at blive samarbejdspartner.",
      "Klik på linket for at bekræfte din henvendelse:",
      confirmUrl,
      this.signature()
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
      throw new Error(`Resend partner confirm failed with status ${response.status}`);
    }
  }

  async sendPartnerInterestReceived(email: string): Promise<void> {
    if (!this.apiKey || !this.fromEmail) {
      return;
    }

    const subject = "Tak for din bekræftelse";
    const text = [
      "Din samarbejdsforespørgsel er bekræftet.",
      "Vi vender tilbage hurtigst muligt.",
      this.signature()
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
      throw new Error(`Resend partner receipt failed with status ${response.status}`);
    }
  }
}
