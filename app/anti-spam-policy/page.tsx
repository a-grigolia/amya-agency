import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anti-Spam Policy",
};

export default function AntiSpamPolicyPage() {
  return (
    <main className="flex min-h-dvh w-full items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-[366px] flex-col gap-6 text-[13px] leading-[18px] tracking-[0.13px]">
        <h1 className="font-normal text-foreground">
          Anti-Spam Policy - The Amya Agency LLC
        </h1>
        <div className="flex flex-col gap-[18px] text-foreground/70">
          <p>
            The Amya Agency LLC prohibits the use of unsolicited bulk email to
            advertise or promote amya.agency or any Amya Agency service.
          </p>
          <p>
            We do not send bulk or promotional email. We do not purchase, rent,
            or use third-party email lists. We do not operate affiliate,
            referral, or reseller programs, and no third party is authorized to
            send email referencing amya.agency on our behalf.
          </p>
          <p>
            All email from our domain is one-to-one business correspondence
            sent by named employees regarding specific job opportunities,
            candidate representation, or client engagements.
          </p>
          <p>
            Any recipient may request removal by replying to any message.
            Removal is permanent and immediate.
          </p>
          <p>
            Violation of this policy by any employee is grounds for
            termination. Any third party sending unsolicited email that
            references amya.agency is doing so without authorization, and we
            will pursue removal.
          </p>
          <p>
            Report suspected misuse of our domain to{" "}
            <a
              href="mailto:security@amya.agency"
              className="transition-colors duration-200 hover:text-foreground"
            >
              security@amya.agency
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
