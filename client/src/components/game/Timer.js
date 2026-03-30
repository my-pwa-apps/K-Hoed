import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
/**
 * Circular SVG countdown timer with smooth animation.
 * Uses requestAnimationFrame for smooth rendering.
 */
export function Timer({ timeLimit, startTime, onExpire, size = 80 }) {
    const circleRef = useRef(null);
    const textRef = useRef(null);
    const rafRef = useRef(0);
    const expiredRef = useRef(false);
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    useEffect(() => {
        expiredRef.current = false;
        function frame() {
            const elapsed = (Date.now() - startTime) / 1000;
            const remaining = Math.max(0, timeLimit - elapsed);
            const fraction = remaining / timeLimit;
            if (circleRef.current) {
                circleRef.current.style.strokeDashoffset = `${circumference * (1 - fraction)}`;
                // Colour: green → amber → red
                const hue = fraction > 0.5 ? 142 : fraction > 0.25 ? 38 : 0;
                circleRef.current.style.stroke = `hsl(${hue}, 72%, 50%)`;
            }
            if (textRef.current) {
                textRef.current.textContent = Math.ceil(remaining).toString();
            }
            if (remaining <= 0) {
                if (!expiredRef.current) {
                    expiredRef.current = true;
                    onExpire?.();
                }
                return;
            }
            rafRef.current = requestAnimationFrame(frame);
        }
        rafRef.current = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(rafRef.current);
    }, [timeLimit, startTime, circumference, onExpire]);
    return (_jsxs("svg", { width: size, height: size, role: "timer", "aria-label": "Question countdown timer", className: "shrink-0", children: [_jsx("circle", { cx: size / 2, cy: size / 2, r: radius, fill: "none", stroke: "currentColor", strokeWidth: 6, className: "text-gray-200" }), _jsx("circle", { ref: circleRef, cx: size / 2, cy: size / 2, r: radius, fill: "none", strokeWidth: 6, strokeLinecap: "round", strokeDasharray: circumference, strokeDashoffset: 0, style: {
                    transform: "rotate(-90deg)",
                    transformOrigin: "50% 50%",
                    transition: "stroke-dashoffset 0.1s linear, stroke 0.4s",
                } }), _jsx("text", { ref: textRef, x: "50%", y: "50%", dominantBaseline: "central", textAnchor: "middle", className: "font-display font-bold fill-current text-gray-800", fontSize: size * 0.32, children: timeLimit })] }));
}
