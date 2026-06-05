import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  staticFile,
  interpolate,
  spring,
  Easing,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/NotoSansJP";
import zoomTrack from "./zoom-track.json";

const { fontFamily } = loadFont();

// ===== タイミング =====
export const FPS = 30;
const PLAYBACK = 1.2; // ゆっくりめ（ペースを落とす）
const RAW_SECONDS = 45.4;
const SYNC_OFFSET = 0;
export const INTRO = 78;
export const BODY = Math.ceil((RAW_SECONDS / PLAYBACK) * FPS);
export const OUTRO = 96;
export const TOTAL_FRAMES = INTRO + BODY + OUTRO;

// ===== 配色 =====
const NAVY = "#0A1A38";
const NAVY2 = "#12305F";
const BRAND = "#2563EB";
const LIGHT = "#7DB0FF";
const WHITE = "#FFFFFF";

// ===== 映像レイアウト（縦型内の固定枠・全体表示）=====
const FRAME_LEFT = 40;
const FRAME_TOP = 470;
const FRAME_W = 1000;
const VIDEO_W = FRAME_W;
const VIDEO_H = Math.round((FRAME_W * 800) / 1280); // 625

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const eventFrame = (tMs: number) => (tMs / 1000 / PLAYBACK) * FPS + SYNC_OFFSET;
const ease = Easing.inOut(Easing.cubic);

// 操作箇所の日本語ラベル
const OP_LABEL: Record<string, string> = {
  login: "ログイン",
  "form-select": "物件を選ぶ",
  "create-btn": "依頼を作成",
  approve: "承認する",
  start: "清掃を開始",
  checklist: "チェック",
  supply: "備品を連絡",
  report: "報告を送信",
  confirm: "確認する",
};

type Ev = { f: number; x: number; y: number; label: string };
const EVENTS: Ev[] = zoomTrack.events.map((e) => ({
  f: eventFrame(e.t),
  x: e.cx * VIDEO_W,
  y: e.cy * VIDEO_H,
  label: OP_LABEL[e.label] ?? "",
}));

// ===== カーソル位置の補間（全編なめらかに移動）=====
type CK = { f: number; x: number; y: number };
const CURSOR_KFS: CK[] = [
  { f: 0, x: VIDEO_W / 2, y: VIDEO_H / 2 },
  ...EVENTS.map((e) => ({ f: e.f, x: e.x, y: e.y })),
  { f: BODY, x: VIDEO_W / 2, y: VIDEO_H * 0.4 },
];
function cursorAt(f: number): { x: number; y: number } {
  let p = CURSOR_KFS[0];
  let n = CURSOR_KFS[CURSOR_KFS.length - 1];
  for (let i = 0; i < CURSOR_KFS.length - 1; i++) {
    if (f >= CURSOR_KFS[i].f && f <= CURSOR_KFS[i + 1].f) {
      p = CURSOR_KFS[i];
      n = CURSOR_KFS[i + 1];
      break;
    }
  }
  const seg = n.f === p.f ? 1 : ease(clamp((f - p.f) / (n.f - p.f), 0, 1));
  return { x: p.x + (n.x - p.x) * seg, y: p.y + (n.y - p.y) * seg };
}

const base: React.CSSProperties = { fontFamily, color: WHITE };

const FadeUp: React.FC<{ delay?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  delay = 0,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const y = interpolate(s, [0, 1], [40, 0]);
  return <div style={{ ...style, opacity: s, transform: `translateY(${y}px)` }}>{children}</div>;
};

// ===== 下部STEPテロップ（録画イベントに同期）=====
const STEPS: { from: number; dur: number; step: string; title: string; sub?: string }[] = [
  { from: 0, dur: 225, step: "STEP 1", title: "管理者がログイン", sub: "専用ダッシュボードへ" },
  { from: 225, dur: 230, step: "STEP 2", title: "清掃依頼をかんたん作成", sub: "物件・日程を選ぶだけ" },
  { from: 455, dur: 105, step: "STEP 3", title: "スタッフはURLを開くだけ", sub: "ワンタップで承認" },
  { from: 560, dur: 165, step: "STEP 4", title: "チェックリストで清掃", sub: "やり残しを防ぐ" },
  { from: 725, dur: 100, step: "STEP 5", title: "備品の不足もその場で連絡", sub: "管理者・オーナーへ自動通知" },
  { from: 825, dur: 150, step: "STEP 6", title: "ワンタップで報告を送信", sub: "" },
  { from: 975, dur: 115, step: "STEP 7", title: "管理者が報告を確認", sub: "ワンクリックで完了" },
  { from: 1090, dur: BODY - 1090, step: "STEP 8", title: "オーナーも進捗を確認", sub: "" },
];

// ===== オーバーレイ部品 =====
const CursorIcon: React.FC<{ press: number }> = ({ press }) => {
  const sc = 1 - press * 0.22;
  return (
    <svg width={40} height={40} viewBox="0 0 24 24" style={{ transform: `scale(${sc})`, transformOrigin: "0 0" }}>
      <path
        d="M3 2 L3 19 L8 14.5 L11.2 21 L14 19.7 L10.8 13.4 L17 13 Z"
        fill="#fff"
        stroke="#0A1A38"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </svg>
  );
};

const Ripple: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 26 });
  const scale = interpolate(p, [0, 1], [0.2, 1.7]);
  const opacity = interpolate(p, [0, 0.15, 1], [0, 0.85, 0]);
  return (
    <div
      style={{
        position: "absolute",
        width: 120,
        height: 120,
        marginLeft: -60,
        marginTop: -60,
        borderRadius: "50%",
        border: `6px solid ${BRAND}`,
        transform: `scale(${scale})`,
        opacity,
        boxShadow: `0 0 24px ${BRAND}`,
      }}
    />
  );
};

const OpLabel: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 200 } });
  const y = interpolate(a, [0, 1], [12, 0]);
  return (
    <div
      style={{
        position: "absolute",
        transform: `translate(-50%, calc(-100% - 26px)) translateY(${y}px)`,
        opacity: a,
        whiteSpace: "nowrap",
      }}
    >
      <div
        style={{
          background: WHITE,
          color: BRAND,
          fontWeight: 800,
          fontSize: 26,
          padding: "8px 18px",
          borderRadius: 12,
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        }}
      >
        {text}
      </div>
      <div
        style={{
          width: 0,
          height: 0,
          margin: "0 auto",
          borderLeft: "10px solid transparent",
          borderRight: "10px solid transparent",
          borderTop: `12px solid ${WHITE}`,
        }}
      />
    </div>
  );
};

const Intro: React.FC = () => (
  <AbsoluteFill
    style={{
      ...base,
      background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY2} 100%)`,
      justifyContent: "center",
      alignItems: "center",
      padding: 90,
      textAlign: "center",
    }}
  >
    <FadeUp delay={2}>
      <div style={{ fontSize: 38, color: LIGHT, fontWeight: 700, letterSpacing: 2, marginBottom: 30 }}>
        民泊オーナー・運営代行の方へ
      </div>
    </FadeUp>
    <FadeUp delay={10}>
      <div style={{ fontSize: 82, fontWeight: 900, lineHeight: 1.3 }}>
        清掃の管理、
        <br />
        まだ<span style={{ color: LIGHT }}>LINEと電話</span>
        <br />
        でやってませんか？
      </div>
    </FadeUp>
    <FadeUp delay={26}>
      <div style={{ fontSize: 34, color: "#A9C2E8", marginTop: 50, fontWeight: 500 }}>
        依頼 → 報告 → 確認を、アプリひとつで。
      </div>
    </FadeUp>
  </AbsoluteFill>
);

const Screen: React.FC = () => {
  const frame = useCurrentFrame();
  const cur = cursorAt(frame);
  // 近接イベントでクリック演出（pressパルス）
  let press = 0;
  for (const e of EVENTS) {
    const d = Math.abs(frame - e.f);
    if (d < 8) press = Math.max(press, 1 - d / 8);
  }
  return (
    <div
      style={{
        position: "absolute",
        top: FRAME_TOP,
        left: FRAME_LEFT,
        width: FRAME_W,
        borderRadius: 26,
        overflow: "hidden",
        boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
        border: "1px solid rgba(255,255,255,0.12)",
        background: "#1b1b1b",
      }}
    >
      <div style={{ height: 46, background: "#222", display: "flex", alignItems: "center", paddingLeft: 22, gap: 12 }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <div key={c} style={{ width: 18, height: 18, borderRadius: 9, background: c }} />
        ))}
      </div>
      {/* 映像エリア（全体表示）＋オーバーレイ */}
      <div style={{ position: "relative", width: VIDEO_W, height: VIDEO_H, overflow: "hidden", background: "#fff" }}>
        <OffthreadVideo src={staticFile("screen.mp4")} playbackRate={PLAYBACK} style={{ width: "100%", display: "block" }} />

        {/* スポットライト（操作箇所以外を軽く暗く）*/}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `radial-gradient(circle 200px at ${cur.x}px ${cur.y}px, rgba(0,0,0,0) 45%, rgba(8,16,36,0.34) 100%)`,
          }}
        />

        {/* クリック波紋 */}
        {EVENTS.map((e, i) => (
          <Sequence key={`r${i}`} from={Math.round(e.f) - 4} durationInFrames={30}>
            <div style={{ position: "absolute", left: e.x, top: e.y }}>
              <Ripple />
            </div>
          </Sequence>
        ))}

        {/* 操作ラベル吹き出し */}
        {EVENTS.map((e, i) =>
          e.label ? (
            <Sequence key={`l${i}`} from={Math.round(e.f) - 6} durationInFrames={66}>
              <div style={{ position: "absolute", left: e.x, top: clamp(e.y, 60, VIDEO_H) }}>
                <OpLabel text={e.label} />
              </div>
            </Sequence>
          ) : null,
        )}

        {/* カーソル */}
        <div style={{ position: "absolute", left: cur.x, top: cur.y, pointerEvents: "none", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }}>
          <CursorIcon press={press} />
        </div>
      </div>
    </div>
  );
};

const Body: React.FC = () => (
  <AbsoluteFill style={{ ...base, background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY2} 100%)` }}>
    <div style={{ position: "absolute", top: 70, width: "100%", textAlign: "center", fontSize: 46, fontWeight: 900, letterSpacing: 1 }}>
      Stay<span style={{ color: LIGHT }}>Clean</span>
      <span style={{ fontSize: 26, color: "#90A8CE", fontWeight: 600, marginLeft: 14 }}>清掃管理アプリ</span>
    </div>

    <Screen />

    {STEPS.map((t) => (
      <Sequence key={t.step} from={t.from} durationInFrames={t.dur}>
        <TelopCard step={t.step} title={t.title} sub={t.sub} />
      </Sequence>
    ))}
  </AbsoluteFill>
);

const TelopCard: React.FC<{ step: string; title: string; sub?: string }> = ({ step, title, sub }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inAnim = spring({ frame, fps, config: { damping: 200 } });
  const y = interpolate(inAnim, [0, 1], [60, 0]);
  return (
    <div style={{ position: "absolute", bottom: 150, left: 70, right: 70, opacity: inAnim, transform: `translateY(${y}px)` }}>
      <div
        style={{
          display: "inline-block",
          background: BRAND,
          color: WHITE,
          fontWeight: 800,
          fontSize: 30,
          padding: "8px 24px",
          borderRadius: 999,
          marginBottom: 22,
          letterSpacing: 1,
        }}
      >
        {step}
      </div>
      <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.25, textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>{title}</div>
      {sub ? <div style={{ fontSize: 38, color: "#B7CCEC", marginTop: 16, fontWeight: 600 }}>{sub}</div> : null}
    </div>
  );
};

const Outro: React.FC = () => (
  <AbsoluteFill
    style={{
      ...base,
      background: `linear-gradient(160deg, ${BRAND} 0%, ${NAVY2} 120%)`,
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center",
      padding: 90,
    }}
  >
    <FadeUp delay={2}>
      <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1.35 }}>
        依頼 → 報告 → 確認
        <br />
        まで、<span style={{ color: "#FFE27A" }}>アプリひとつ</span>で完結。
      </div>
    </FadeUp>
    <FadeUp delay={18}>
      <div style={{ fontSize: 60, fontWeight: 900, marginTop: 60 }}>
        Stay<span style={{ color: "#CFE0FF" }}>Clean</span>
      </div>
    </FadeUp>
    <FadeUp delay={28}>
      <div style={{ fontSize: 32, color: "#E6EEFF", marginTop: 26, fontWeight: 600 }}>こういう業務アプリ、作っています。</div>
    </FadeUp>
  </AbsoluteFill>
);

export const StayCleanDemo: React.FC = () => (
  <AbsoluteFill style={{ background: NAVY }}>
    <Sequence durationInFrames={INTRO}>
      <Intro />
    </Sequence>
    <Sequence from={INTRO} durationInFrames={BODY}>
      <Body />
    </Sequence>
    <Sequence from={INTRO + BODY} durationInFrames={OUTRO}>
      <Outro />
    </Sequence>
  </AbsoluteFill>
);
