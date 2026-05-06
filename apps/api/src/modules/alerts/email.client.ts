/**
 * Thin wrapper around Resend for sending the daily digest.
 * Lazily imported so unit tests don't need the dependency.
 */

export interface EmailClient {
  send(args: { to: string; subject: string; html: string }): Promise<{ id: string }>;
}

export class ResendEmailClient implements EmailClient {
  private client: unknown | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(args: { to: string; subject: string; html: string }): Promise<{ id: string }> {
    if (!this.client) {
      const { Resend } = await import('resend');
      this.client = new Resend(this.apiKey);
    }
    const c = this.client as { emails: { send: (a: unknown) => Promise<{ data: { id: string } | null }> } };
    const result = await c.emails.send({
      from: this.from,
      to: args.to,
      subject: args.subject,
      html: args.html,
    });
    return { id: result.data?.id ?? '' };
  }
}

export class NoopEmailClient implements EmailClient {
  async send(): Promise<{ id: string }> {
    return { id: 'noop' };
  }
}
