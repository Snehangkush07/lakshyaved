import { useState } from 'react';
import { formatINR } from '../../core/utils/format';

export default function SalaryProjectionChart({ projection }) {
    const [hoveredYear, setHoveredYear] = useState(null);

    // Edge cases: missing or fewer than 2 entries
    if (!projection || !Array.isArray(projection) || projection.length < 2) {
        return null;
    }

    // Default salary fallback to avoid NaN if any year has missing salaryINR
    const fallbackSalary = (typeof projection[0]?.salaryINR === 'number' && !isNaN(projection[0].salaryINR))
        ? projection[0].salaryINR
        : 0;

    const cleanProjection = projection.map((p, idx) => {
        const salaryINR = (typeof p.salaryINR === 'number' && !isNaN(p.salaryINR))
            ? p.salaryINR
            : fallbackSalary;
        const salaryOptimistic = (typeof p.salaryOptimistic === 'number' && !isNaN(p.salaryOptimistic))
            ? p.salaryOptimistic
            : salaryINR;
        const salaryPessimistic = (typeof p.salaryPessimistic === 'number' && !isNaN(p.salaryPessimistic))
            ? p.salaryPessimistic
            : salaryINR;
        return {
            ...p,
            year: p.year ?? (idx + 1),
            salaryINR,
            salaryOptimistic,
            salaryPessimistic,
            title: p.title || `Year ${idx + 1}`
        };
    });

    const p0 = cleanProjection[0];
    const p4 = cleanProjection[4] || cleanProjection[cleanProjection.length - 1];

    const year1SalaryVal = p0.salaryINR;
    const year5SalaryVal = p4.salaryINR;
    const growthPercent = year1SalaryVal > 0
        ? Math.round(((year5SalaryVal / year1SalaryVal) - 1) * 100)
        : 0;

    // Y-axis bounds
    const p0Pessimistic = (typeof p0.salaryPessimistic === 'number' && !isNaN(p0.salaryPessimistic))
        ? p0.salaryPessimistic
        : year1SalaryVal;
    const p4Optimistic = (typeof p4.salaryOptimistic === 'number' && !isNaN(p4.salaryOptimistic))
        ? p4.salaryOptimistic
        : year5SalaryVal;

    const minY = 0.85 * p0Pessimistic;
    const maxY = 1.05 * p4Optimistic;
    const yRange = (maxY - minY) > 0 ? (maxY - minY) : 1;

    // SVG Layout Dimensions
    const svgWidth = 600;
    const svgHeight = 260;
    const paddingLeft = 55;
    const paddingRight = 30;
    const paddingTop = 30;
    const paddingBottom = 35;
    const plotWidth = svgWidth - paddingLeft - paddingRight;
    const plotHeight = svgHeight - paddingTop - paddingBottom;

    const numPoints = cleanProjection.length;
    const getX = (i) => paddingLeft + (numPoints > 1 ? (i / (numPoints - 1)) * plotWidth : plotWidth / 2);
    const getY = (val) => paddingTop + (1 - (val - minY) / yRange) * plotHeight;

    const generatePath = (key) => {
        return cleanProjection.map((item, idx) => {
            const x = getX(idx);
            const y = getY(item[key]);
            return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
        }).join(' ');
    };

    const pessimisticPath = generatePath('salaryPessimistic');
    const realisticPath = generatePath('salaryINR');
    const optimisticPath = generatePath('salaryOptimistic');

    // 3 horizontal gridlines (min, mid, max)
    const gridFractions = [0, 0.5, 1];

    const hoveredIndex = hoveredYear !== null
        ? cleanProjection.findIndex(p => p.year === hoveredYear)
        : -1;
    const hoveredItem = hoveredIndex !== -1 ? cleanProjection[hoveredIndex] : null;

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121a2a] p-5">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Salary Projection</h4>

            {/* 1. Summary Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#151e2e] border border-slate-200/60 dark:border-white/5">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        YEAR 1 SALARY
                    </div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                        {formatINR(year1SalaryVal)}
                    </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#151e2e] border border-slate-200/60 dark:border-white/5">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        YEAR 5 SALARY
                    </div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                        {formatINR(year5SalaryVal)}
                    </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#151e2e] border border-slate-200/60 dark:border-white/5">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        5-YEAR GROWTH
                    </div>
                    <div className="text-lg font-bold text-[#13ec6d] mt-1">
                        +{growthPercent}%
                    </div>
                </div>
            </div>

            {/* 2. SVG Line Chart */}
            <div className="w-full relative" style={{ height: `${svgHeight}px` }}>
                <svg
                    className="w-full h-full overflow-visible"
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                >
                    {/* 3 horizontal gridlines with labels formatted as ₹{X}L */}
                    {gridFractions.map((frac, idx) => {
                        const gridVal = minY + frac * (maxY - minY);
                        const y = getY(gridVal);
                        const xVal = (gridVal / 100000).toFixed(1);
                        return (
                            <g key={`grid-${idx}`}>
                                <line
                                    x1={paddingLeft}
                                    y1={y}
                                    x2={svgWidth - paddingRight}
                                    y2={y}
                                    stroke="currentColor"
                                    className="text-slate-200 dark:text-slate-800"
                                    strokeWidth="1"
                                    strokeDasharray="3 3"
                                />
                                <text
                                    x={paddingLeft - 8}
                                    y={y + 4}
                                    textAnchor="end"
                                    className="text-[11px] fill-slate-400 dark:fill-slate-500 font-medium"
                                >
                                    ₹{xVal}L
                                </text>
                            </g>
                        );
                    })}

                    {/* X-axis labels (Year 1..Year 5) */}
                    {cleanProjection.map((item, idx) => {
                        const x = getX(idx);
                        return (
                            <text
                                key={`xaxis-${item.year}`}
                                x={x}
                                y={svgHeight - 10}
                                textAnchor="middle"
                                className="text-[11px] fill-slate-500 dark:fill-slate-400 font-medium"
                            >
                                Year {item.year}
                            </text>
                        );
                    })}

                    {/* Curves drawn bottom-to-top */}
                    {/* 1. Pessimistic: dashed slate line */}
                    <path
                        d={pessimisticPath}
                        fill="none"
                        stroke="currentColor"
                        className="text-slate-400 dark:text-slate-500"
                        strokeWidth="2"
                        opacity="0.5"
                        strokeDasharray="4 4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    {/* Pessimistic markers (outlined only) */}
                    {cleanProjection.map((item, idx) => (
                        <circle
                            key={`pess-mark-${item.year}`}
                            cx={getX(idx)}
                            cy={getY(item.salaryPessimistic)}
                            r="3.5"
                            fill="none"
                            stroke="currentColor"
                            className="text-slate-400 dark:text-slate-500"
                            strokeWidth="1.5"
                            opacity="0.5"
                        />
                    ))}

                    {/* 2. Realistic: solid emerald line */}
                    <path
                        d={realisticPath}
                        fill="none"
                        stroke="#13ec6d"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    {/* Realistic markers (filled emerald) */}
                    {cleanProjection.map((item, idx) => (
                        <circle
                            key={`real-mark-${item.year}`}
                            cx={getX(idx)}
                            cy={getY(item.salaryINR)}
                            r="4"
                            fill="#13ec6d"
                            stroke="#ffffff"
                            className="dark:stroke-[#121a2a]"
                            strokeWidth="1.5"
                        />
                    ))}

                    {/* 3. Optimistic: solid emerald line with lower opacity */}
                    <path
                        d={optimisticPath}
                        fill="none"
                        stroke="#13ec6d"
                        strokeWidth="2"
                        strokeOpacity="0.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    {/* Optimistic markers (outlined only) */}
                    {cleanProjection.map((item, idx) => (
                        <circle
                            key={`opt-mark-${item.year}`}
                            cx={getX(idx)}
                            cy={getY(item.salaryOptimistic)}
                            r="3.5"
                            fill="none"
                            stroke="#13ec6d"
                            strokeOpacity="0.5"
                            strokeWidth="1.5"
                        />
                    ))}

                    {/* 3. Hover Interaction: 20px-wide transparent rects */}
                    {cleanProjection.map((item, idx) => {
                        const x = getX(idx);
                        return (
                            <rect
                                key={`hover-rect-${item.year}`}
                                x={x - 10}
                                y={paddingTop}
                                width={20}
                                height={plotHeight}
                                fill="transparent"
                                className="cursor-pointer"
                                onMouseEnter={() => setHoveredYear(item.year)}
                                onMouseLeave={() => setHoveredYear(null)}
                            />
                        );
                    })}

                    {/* Tooltip on Hover */}
                    {hoveredYear !== null && hoveredItem && (() => {
                        const hX = getX(hoveredIndex);
                        const tooltipWidth = 160;
                        const tooltipHeight = 54;
                        const tooltipX = Math.max(paddingLeft, Math.min(svgWidth - paddingRight - tooltipWidth, hX - tooltipWidth / 2));
                        const tooltipY = 6;
                        return (
                            <g pointerEvents="none">
                                <line
                                    x1={hX}
                                    y1={paddingTop}
                                    x2={hX}
                                    y2={paddingTop + plotHeight}
                                    stroke="#13ec6d"
                                    strokeWidth="1"
                                    strokeDasharray="2 2"
                                    opacity="0.4"
                                />
                                <rect
                                    x={tooltipX}
                                    y={tooltipY}
                                    width={tooltipWidth}
                                    height={tooltipHeight}
                                    rx="6"
                                    className="fill-slate-900/95 dark:fill-[#0b111e]/95 stroke-slate-700 dark:stroke-slate-700 shadow-xl"
                                    strokeWidth="1"
                                />
                                <text
                                    x={tooltipX + tooltipWidth / 2}
                                    y={tooltipY + 16}
                                    textAnchor="middle"
                                    className="text-[11px] font-bold fill-white"
                                >
                                    Year {hoveredYear}
                                </text>
                                <text
                                    x={tooltipX + tooltipWidth / 2}
                                    y={tooltipY + 31}
                                    textAnchor="middle"
                                    className="text-[10px] font-semibold fill-[#13ec6d]"
                                >
                                    Realistic: {formatINR(hoveredItem.salaryINR)}
                                </text>
                                <text
                                    x={tooltipX + tooltipWidth / 2}
                                    y={tooltipY + 45}
                                    textAnchor="middle"
                                    className="text-[10px] fill-slate-300"
                                >
                                    {hoveredItem.title}
                                </text>
                            </g>
                        );
                    })()}
                </svg>
            </div>

            {/* Legend row below chart */}
            <div className="flex items-center justify-center gap-6 mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full border border-[#13ec6d] opacity-50" />
                    <span>Optimistic</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#13ec6d]" />
                    <span>Realistic</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full border border-slate-400 border-dashed opacity-75" />
                    <span>Pessimistic</span>
                </div>
            </div>
        </div>
    );
}
