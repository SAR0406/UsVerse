import Link from "next/link";
import { Home, Search, Tag, User, WandSparkles } from "lucide-react";

const bars = [
  "bg-[#B12267] w-3/4",
  "bg-[#955322] w-2/3",
  "bg-[#665A8E] w-1/2",
];

const chips = ["#B12267", "#955322", "#665A8E", "#C61556"];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#D7CC79] p-4 md:p-6 text-[#3f3a17]">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-[246px_1fr] gap-3">
          <section className="space-y-3">
            <ColorCard title="Primary" code="#FF6B9D" color="#FF6B9D" />
            <ColorCard title="Secondary" code="#FFAB76" color="#FFAB76" />
            <ColorCard title="Tertiary" code="#C8B6E2" color="#C8B6E2" />
            <ColorCard title="Neutral" code="#FFF3B0" color="#FFF3B0" />
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <Card>
              <p className="text-[#a5a05b] text-xl">Headline</p>
              <p className="font-serif text-[7rem] leading-none text-[#3B3806] mt-2 text-center">
                Aa
              </p>
            </Card>

            <Card className="flex items-center justify-center">
              <div className="w-full max-w-[260px] space-y-2.5">
                <div className="flex gap-2.5">
                  <Pill className="bg-[#B12267] text-white">Primary</Pill>
                  <Pill className="bg-[#E8DC8C] text-[#6D6628]">Secondary</Pill>
                </div>
                <div className="flex gap-2.5">
                  <Pill className="bg-black text-[#D7CC79]">Inverted</Pill>
                  <Pill className="border border-[#8F854A] text-[#6D6628]">Outlined</Pill>
                </div>
              </div>
            </Card>

            <Card className="flex items-center">
              <div className="flex items-center gap-2 rounded-full border border-[#ADA256] px-4 py-3 w-full text-[#8B8342]">
                <Search className="w-4 h-4" />
                <span className="text-2xl">Search</span>
              </div>
            </Card>

            <Card>
              <p className="text-[#a5a05b] text-xl">Body</p>
              <p className="font-serif text-[7rem] leading-none text-[#676228] mt-2 text-center">
                Aa
              </p>
            </Card>

            <Card className="flex items-center">
              <div className="w-full space-y-2.5">
                {bars.map((bar, index) => (
                  <div key={index} className="h-2 rounded-full bg-[#DCD188]">
                    <div className={`h-full rounded-full ${bar}`} />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="flex items-center justify-center">
              <div className="rounded-3xl bg-[#DBD081] px-6 py-4 flex gap-9">
                <RoundIcon className="bg-[#B12267] text-white">
                  <Home className="w-4 h-4" />
                </RoundIcon>
                <Search className="w-5 h-5 text-[#6D6628]" />
                <User className="w-5 h-5 text-[#6D6628]" />
              </div>
            </Card>

            <Card>
              <p className="text-[#a5a05b] text-xl">Label</p>
              <p className="font-serif text-[7rem] leading-none text-[#676228] mt-2 text-center">
                Aa
              </p>
            </Card>

            <Card className="flex items-center justify-center">
              <RoundIcon className="bg-[#C8B6E2] text-[#655d9a] w-11 h-11">
                <Tag className="w-5 h-5" />
              </RoundIcon>
            </Card>

            <Card className="flex items-center justify-center gap-5 flex-wrap">
              <Pill className="bg-[#FF6B9D] text-[#4b102b] px-5 py-2.5 text-[30px]">
                <span className="inline-flex items-center gap-2">
                  <Tag className="w-4 h-4" /> Label
                </span>
              </Pill>
              {chips.map((chip) => (
                <RoundIcon key={chip} className="text-white" style={{ backgroundColor: chip }}>
                  <WandSparkles className="w-4 h-4" />
                </RoundIcon>
              ))}
            </Card>
          </section>
        </div>

        <div className="mt-5 text-center">
          <Link
            href="/login"
            className="inline-flex rounded-full bg-[#B12267] px-6 py-3 text-white text-sm font-semibold hover:brightness-110 transition"
          >
            Enter UsVerse
          </Link>
        </div>
      </div>
    </main>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`rounded-3xl bg-[#E7DD93] p-5 min-h-[184px] ${className}`}>{children}</div>;
}

function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-full px-6 py-2 text-2xl leading-none text-center min-w-[120px] ${className ?? ""}`}>
      {children}
    </div>
  );
}

function RoundIcon({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center ${className ?? ""}`}
      style={style}
    >
      {children}
    </div>
  );
}

function ColorCard({
  title,
  code,
  color,
}: {
  title: string;
  code: string;
  color: string;
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-[#E7DD93]">
      <div
        className="h-[108px] px-4 pt-4 flex items-start justify-between text-[#2e2a10] font-semibold text-xl"
        style={{ backgroundColor: color }}
      >
        <span>{title}</span>
        <span className="font-medium">{code}</span>
      </div>
      <div className="h-[54px] grid grid-cols-10" role="list" aria-label={`${title} shade scale`}>
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            role="listitem"
            aria-label={`${Math.min(index * 9, 90)}% darker`}
            style={{
              backgroundColor: `color-mix(in oklab, ${color} ${100 - index * 9}%, black ${index * 9}%)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
