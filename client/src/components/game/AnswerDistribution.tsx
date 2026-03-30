import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ANSWER_COLORS } from "@/lib/utils";
import type { QuestionPayload } from "@/lib/types";

interface AnswerDistributionProps {
  distribution: Record<string, number>;
  question: QuestionPayload;
  correctAnswerIds: string[];
}

export function AnswerDistribution({
  distribution,
  question,
  correctAnswerIds,
}: AnswerDistributionProps) {
  const data = question.answerOptions.map((opt, i) => ({
    name: opt.text.length > 20 ? opt.text.slice(0, 18) + "…" : opt.text,
    fullText: opt.text,
    count: distribution[opt.id] ?? 0,
    isCorrect: correctAnswerIds.includes(opt.id),
    color: ANSWER_COLORS[i % ANSWER_COLORS.length]!,
  }));

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: "#6b7280", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide allowDecimals={false} />
          <Tooltip
            formatter={(value: number, _name, props) => [
              `${value} (${total > 0 ? Math.round((value / total) * 100) : 0}%)`,
              props.payload?.fullText,
            ]}
            cursor={{ fill: "rgba(0,0,0,0.05)" }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={
                  entry.isCorrect
                    ? "#22c55e"
                    : entry.color.bg.replace("bg-", "").replace("-500", "")
                      // fallback solid colour since Tailwind classes don't translate to hex
                      ? `hsl(${index * 60}, 70%, 60%)`
                      : "#9ca3af"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 justify-center mt-2">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 text-xs text-gray-600"
          >
            <span
              className={`w-3 h-3 rounded-sm ${d.isCorrect ? "bg-emerald-500" : "bg-gray-400"}`}
              aria-hidden
            />
            <span>{d.name}</span>
            {d.isCorrect && (
              <span className="text-emerald-600 font-semibold">✓</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
