"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import type { AxisFitDetail } from "@/types/tpo";
import { AXIS_META } from "@/types/tpo";

interface StyleRadarChartProps {
  axisDetails: AxisFitDetail[];
  /** 차트 높이 (px). 기본값 260 */
  height?: number;
}

/** recharts PolarAngleAxis의 커스텀 tick — EN 이름 + KR 서브레이블 */
const CustomAxisTick = (props: {
  x?: number;
  y?: number;
  cx?: number;
  cy?: number;
  payload?: { value: string };
}) => {
  const { x = 0, y = 0, cx = 0, cy = 0, payload } = props;
  const meta = AXIS_META.find((m) => m.key === payload?.value);
  if (!meta) return null;

  // 텍스트 앵커: 차트 중심 기준으로 좌/우/위/아래 결정
  const dx = x - cx;
  const anchor =
    Math.abs(dx) < 8 ? "middle" : dx > 0 ? "start" : "end";

  return (
    <g>
      {/* 영문 축 이름 */}
      <text
        x={x}
        y={y - 4}
        textAnchor={anchor}
        dominantBaseline="auto"
        fontFamily="'DM Sans', sans-serif"
        fontSize={10}
        fontWeight={600}
        fill="#1C1C1E"
        letterSpacing="0.03em"
      >
        {meta.en}
      </text>
      {/* 한국어 서브레이블 */}
      <text
        x={x}
        y={y + 10}
        textAnchor={anchor}
        dominantBaseline="auto"
        fontFamily="'DM Sans', sans-serif"
        fontSize={8.5}
        fill="#1C1C1E"
        fillOpacity={0.38}
      >
        {meta.kr}
      </text>
    </g>
  );
};

export function StyleRadarChart({
  axisDetails,
  height = 260,
}: StyleRadarChartProps) {
  /** recharts 데이터 포맷: subject = axis key */
  const data = AXIS_META.map((meta) => {
    const detail = axisDetails.find((d) => d.axis === meta.key);
    return {
      subject:  meta.key,
      target:   detail ? detail.tpo_target   : 0,
      current:  detail ? detail.outfit_value : 0,
    };
  });

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart
          data={data}
          cx="50%"
          cy="50%"
          outerRadius="62%"
          margin={{ top: 28, right: 32, bottom: 28, left: 32 }}
        >
          {/* 그리드 — Pearl 계열 */}
          <PolarGrid
            stroke="#EDE8DF"
            strokeWidth={1}
            gridType="polygon"
          />

          {/* 반경 축 — 숫자 레이블 숨김 */}
          <PolarRadiusAxis
            domain={[0, 1]}
            tick={false}
            axisLine={false}
            tickCount={5}
          />

          {/* 각도 축 — 커스텀 tick */}
          <PolarAngleAxis
            dataKey="subject"
            tick={CustomAxisTick as never}
            tickLine={false}
            axisLine={false}
          />

          {/* ① 목표치 — Gold 실선 + 반투명 채움 */}
          <Radar
            name="목표"
            dataKey="target"
            stroke="#C9A84C"
            strokeWidth={1.5}
            fill="#C9A84C"
            fillOpacity={0.12}
            dot={false}
          />

          {/* ② 현재치 — Charcoal 점선, 채움 없음 */}
          <Radar
            name="현재"
            dataKey="current"
            stroke="#1C1C1E"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            fill="transparent"
            dot={{
              r: 3,
              fill: "#1C1C1E",
              fillOpacity: 0.6,
              stroke: "none",
            }}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* 범례 */}
      <div className="mt-1 flex items-center justify-center gap-5">
        <LegendItem color="gold" label="TPO 목표" dashed={false} />
        <LegendItem color="charcoal" label="현재 코디" dashed />
      </div>
    </div>
  );
}

function LegendItem({
  color,
  label,
  dashed,
}: {
  color: "gold" | "charcoal";
  label: string;
  dashed: boolean;
}) {
  const lineColor = color === "gold" ? "#C9A84C" : "#1C1C1E";
  return (
    <div className="flex items-center gap-1.5">
      <svg width={20} height={2} viewBox="0 0 20 2" aria-hidden>
        <line
          x1={0}
          y1={1}
          x2={20}
          y2={1}
          stroke={lineColor}
          strokeWidth={2}
          strokeDasharray={dashed ? "4 3" : undefined}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="text-[10px] tracking-wide"
        style={{ color: lineColor, opacity: color === "charcoal" ? 0.6 : 1 }}
      >
        {label}
      </span>
    </div>
  );
}
