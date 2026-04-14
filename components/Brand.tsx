import Logo from "./Logo";

type BrandProps = {
  suffix?: string;
  size?: number;
};

export default function Brand({ suffix = "", size = 40 }: BrandProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <Logo size={size} />

      {suffix && (
        <span
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            color: "white",
          }}
        >
          {suffix}
        </span>
      )}
    </div>
  );
}