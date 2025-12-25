'use client';

import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
    type TooltipItem,
    type Plugin,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { useMemo, useRef, type ReactElement } from 'react';

ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
);

export type AssessmentSnapshot = {
    id: string;
    name: string;
    createdAt: string;
    scores: Record<string, number>;
};

type WheelChartProps = {
    categories: string[];
    currentScores: Record<string, number>;
    comparison?: AssessmentSnapshot | null;
    onExport?: (dataUrl: string) => void;
    userName?: string;
};

export function WheelChart({
    categories,
    currentScores,
    comparison,
    onExport,
    userName,
}: WheelChartProps): ReactElement {
    const chartRef = useRef<ChartJS<'radar'> | null>(null);

    const data = useMemo(() => {
        const labels = categories;
        const currentValues = labels.map(
            (label) => currentScores[label] ?? 0,
        );
        const comparisonValues = comparison
            ? labels.map((label) => comparison.scores[label] ?? 0)
            : null;

        return {
            labels,
            datasets: [
                {
                    label: 'Current Assessment',
                    data: currentValues,
                    backgroundColor: 'rgba(59, 130, 246, 0.25)',
                    borderColor: 'rgba(37, 99, 235, 1)',
                    pointBackgroundColor: 'rgba(37, 99, 235, 1)',
                    pointBorderColor: '#ffffff',
                    borderWidth: 2,
                    pointRadius: 4,
                },
                ...(comparisonValues
                    ? [
                        {
                            label: comparison?.name ?? 'Previous Assessment',
                            data: comparisonValues,
                            backgroundColor: 'rgba(16, 185, 129, 0.2)',
                            borderColor: 'rgba(5, 150, 105, 1)',
                            pointBackgroundColor: 'rgba(5, 150, 105, 1)',
                            pointBorderColor: '#ffffff',
                            borderWidth: 2,
                            pointRadius: 3,
                        },
                    ]
                    : []),
            ],
        };
    }, [categories, comparison, currentScores]);

    const options = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false as const,
            layout: {
                padding: {
                    top: 24,
                },
            },
            plugins: {
                legend: {
                    position: 'bottom' as const,
                    labels: {
                        color: '#0f172a', // slate-900
                        font: {
                            size: 12,
                            family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        },
                    },
                },
                tooltip: {
                    callbacks: {
                        label(context: TooltipItem<'radar'>) {
                            return `${context.dataset.label}: ${context.formattedValue}/10`;
                        },
                    },
                },
            },
            scales: {
                r: {
                    beginAtZero: true,
                    min: 0,
                    max: 10,
                    ticks: {
                        stepSize: 2,
                        showLabelBackdrop: false,
                        color: '#64748b', // slate-500
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.4)', // slate-400
                    },
                    angleLines: {
                        color: 'rgba(148, 163, 184, 0.4)',
                    },
                    pointLabels: {
                        font: {
                            size: 12,
                        },
                        color: '#0f172a',
                    },
                },
            },
        }),
        [],
    );

    const exportInfoPlugin = useMemo<Plugin<'radar'>>(
        () => ({
            id: 'exportInfo',
            afterDraw: (chart) => {
                const { ctx, chartArea } = chart;
                if (!ctx || !chartArea) return;

                const trimmedName = userName?.trim();
                const now = new Date();
                const dateString = now.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                });

                const label = trimmedName
                    ? `${trimmedName} · ${dateString}`
                    : dateString;

                ctx.save();
                ctx.font =
                    '12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
                ctx.fillStyle = '#0f172a';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';

                const x = chartArea.right;
                const y = chartArea.top - 8;

                ctx.fillText(label, x, y);
                ctx.restore();
            },
        }),
        [userName],
    );

    const handleExport = () => {
        if (!onExport || !chartRef.current) return;
        const chart = chartRef.current;
        const url = chart?.toBase64Image?.();
        if (url && typeof url === 'string') {
            onExport(url);
        }
    };

    return (
        <div className="flex h-full flex-col gap-4">
            <div className="relative h-80 w-full rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
                <Radar
                    ref={chartRef}
                    data={data}
                    options={options}
                    plugins={[exportInfoPlugin]}
                />
            </div>
            {onExport && (
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={handleExport}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                    >
                        <span>Download chart</span>
                    </button>
                </div>
            )}
        </div>
    );
}


