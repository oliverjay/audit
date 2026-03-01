import { FadeIn } from "./fade-in";

interface SectionHeadingProps {
  subtitle?: string;
  title: string;
  description?: string;
  descriptionClassName?: string;
}

export function SectionHeading({ subtitle, title, description, descriptionClassName }: SectionHeadingProps) {
  return (
    <FadeIn className="text-center">
      {subtitle && (
        <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-white/40">{subtitle}</p>
      )}
      <h2
        className={`${subtitle ? "mt-5 " : ""}text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.03em] text-white`}
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        {title}
      </h2>
      {description && (
        <p className={descriptionClassName ?? "mt-4 text-[16px] leading-[1.7] text-white/45 max-w-md mx-auto"}>
          {description}
        </p>
      )}
    </FadeIn>
  );
}
