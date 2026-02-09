import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler,
} from "chart.js";
import { Line, Doughnut, Bar, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler
);

// Paletas de colores modernas
const gradientColors = [
  { bg: "rgba(99, 102, 241, 0.85)", border: "rgb(99, 102, 241)" }, // Indigo
  { bg: "rgba(16, 185, 129, 0.85)", border: "rgb(16, 185, 129)" }, // Emerald
  { bg: "rgba(245, 158, 11, 0.85)", border: "rgb(245, 158, 11)" }, // Amber
  { bg: "rgba(239, 68, 68, 0.85)", border: "rgb(239, 68, 68)" }, // Red
  { bg: "rgba(124, 58, 237, 0.85)", border: "rgb(124, 58, 237)" }, // Purple
  { bg: "rgba(6, 182, 212, 0.85)", border: "rgb(6, 182, 212)" }, // Cyan
  { bg: "rgba(236, 72, 153, 0.85)", border: "rgb(236, 72, 153)" }, // Pink
  { bg: "rgba(59, 130, 246, 0.85)", border: "rgb(59, 130, 246)" }, // Blue
];

export const AreaLineChart: React.FC<{ labels: string[]; data: number[]; label?: string }> = ({ labels, data, label = "Tendencia" }) => {
  const chartData = {
    labels,
    datasets: [
      {
        label,
        data,
        fill: true,
        backgroundColor: "rgba(99,102,241,0.12)",
        borderColor: "rgba(99,102,241,1)",
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "rgba(99,102,241,1)",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        cornerRadius: 8,
      }
    },
    scales: {
      y: { 
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        }
      },
      x: {
        grid: {
          display: false,
        }
      }
    },
  } as any;

  return <Line data={chartData} options={options} />;
};

export const CategoryDoughnut: React.FC<{ labels: string[]; values: number[] }> = ({ labels, values }) => {
  const colors = labels.map((_, i) => gradientColors[i % gradientColors.length].bg);
  const borderColors = labels.map((_, i) => gradientColors[i % gradientColors.length].border);

  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors,
        borderColor: borderColors,
        borderWidth: 2,
        hoverOffset: 12,
        spacing: 2,
      },
    ],
  };

  const options = { 
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { 
        position: "bottom",
        labels: {
          padding: 15,
          font: { size: 12 },
          usePointStyle: true,
          pointStyle: "circle",
        }
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    cutout: "65%",
  } as any;

  return <Doughnut data={data} options={options} />;
};

export const PieChart: React.FC<{ labels: string[]; values: number[]; title?: string }> = ({ labels, values, title }) => {
  const colors = labels.map((_, i) => gradientColors[i % gradientColors.length].bg);
  const borderColors = labels.map((_, i) => gradientColors[i % gradientColors.length].border);

  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors,
        borderColor: borderColors,
        borderWidth: 2,
        hoverOffset: 10,
      },
    ],
  };

  const options = { 
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { 
        position: "bottom",
        labels: {
          padding: 15,
          font: { size: 11 },
          usePointStyle: true,
          pointStyle: "circle",
        }
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      },
      title: {
        display: !!title,
        text: title,
      }
    },
  } as any;

  return <Pie data={data} options={options} />;
};

export const VerticalBar: React.FC<{ labels: string[]; values: number[]; label?: string }> = ({ labels, values, label = "Valores" }) => {
  const colors = values.map((_, i) => gradientColors[i % gradientColors.length].bg);

  const data = {
    labels,
    datasets: [
      {
        label,
        data: values,
        backgroundColor: colors,
        borderRadius: 8,
        borderWidth: 0,
      },
    ],
  };

  const options = { 
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        cornerRadius: 8,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        }
      },
      x: {
        grid: {
          display: false,
        }
      }
    },
  } as any;

  return <Bar data={data} options={options} />;
};

export default {
  AreaLineChart,
  CategoryDoughnut,
  PieChart,
  VerticalBar,
};
