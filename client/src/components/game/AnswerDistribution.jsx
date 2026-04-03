import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, } from "recharts";
import { ANSWER_COLORS } from "@/lib/utils";
export function AnswerDistribution({ distribution, question, correctAnswerIds, }) {
    const data = question.answerOptions.map((opt, i) => ({
        name: opt.text.length > 20 ? opt.text.slice(0, 18) + "…" : opt.text,
        fullText: opt.text,
        count: distribution[opt.id] ?? 0,
        isCorrect: correctAnswerIds.includes(opt.id),
        color: ANSWER_COLORS[i % ANSWER_COLORS.length],
    }));
    const total = data.reduce((sum, d) => sum + d.count, 0);
    return (_jsxs("div", { className: "w-full", children: [_jsx(ResponsiveContainer, { width: "100%", height: 200, children: _jsxs(BarChart, { data: data, margin: { top: 8, right: 8, bottom: 8, left: 8 }, children: [_jsx(XAxis, { dataKey: "name", tick: { fill: "#6b7280", fontSize: 12 }, axisLine: false, tickLine: false }), _jsx(YAxis, { hide: true, allowDecimals: false }), _jsx(Tooltip, { formatter: (value, _name, props) => [
                                `${value} (${total > 0 ? Math.round((value / total) * 100) : 0}%)`,
                                props.payload?.fullText,
                            ], cursor: { fill: "rgba(0,0,0,0.05)" } }), _jsx(Bar, { dataKey: "count", radius: [6, 6, 0, 0], children: data.map((entry, index) => (_jsx(Cell, { fill: entry.isCorrect
                                    ? "#22c55e"
                                    : entry.color.bg.replace("bg-", "").replace("-500", "")
                                        // fallback solid colour since Tailwind classes don't translate to hex
                                        ? `hsl(${index * 60}, 70%, 60%)`
                                        : "#9ca3af" }, index))) })] }) }), _jsx("div", { className: "flex flex-wrap gap-2 justify-center mt-2", children: data.map((d, i) => (_jsxs("div", { className: "flex items-center gap-1.5 text-xs text-gray-600", children: [_jsx("span", { className: `w-3 h-3 rounded-sm ${d.isCorrect ? "bg-emerald-500" : "bg-gray-400"}`, "aria-hidden": true }), _jsx("span", { children: d.name }), d.isCorrect && (_jsx("span", { className: "text-emerald-600 font-semibold", children: "\u2713" }))] }, i))) })] }));
}
